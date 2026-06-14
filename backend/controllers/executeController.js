const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const executeCode = async (req, res) => {
  // We now expect the entire file tree AND the ID of the file they clicked "Run" on
  const { activeFileId, files } = req.body;

  if (!files || !activeFileId) {
    return res.status(400).json({ output: 'Missing project files' });
  }

  // Find the file we are actually supposed to execute
  const activeFile = files.find(f => f.id === activeFileId || f._id === activeFileId);
  if (!activeFile) {
    return res.status(400).json({ output: 'File not found' });
  }

  // Generate a unique workspace folder for this specific execution
  const executionId = uuidv4();
  const baseDir = path.join(__dirname, 'temp', executionId);

  try {
    // 1. Create the temporary workspace folders on your host machine
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp')); // Make sure the parent 'temp' folder exists
    }
    fs.mkdirSync(baseDir, { recursive: true });

    // Helper Function: Trace a file's parentId to figure out its exact folder path
    const getRelativePath = (nodeId) => {
      let current = files.find(f => f.id === nodeId || f._id === nodeId);
      let nodePath = current.name;
      while (current.parentId) {
        current = files.find(f => f.id === current.parentId || f._id === current.parentId);
        if (current) {
          nodePath = path.join(current.name, nodePath);
        } else {
          break;
        }
      }
      return nodePath;
    };

    // 2. Loop through every single file/folder and write them to the temporary workspace
    for (const node of files) {
      const relativePath = getRelativePath(node.id || node._id);
      const fullPath = path.join(baseDir, relativePath);

      if (node.type === 'folder') {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      } else {
        // It's a file! Make sure its parent folder exists, then write the code.
        const dirName = path.dirname(fullPath);
        if (!fs.existsSync(dirName)) {
          fs.mkdirSync(dirName, { recursive: true });
        }
        fs.writeFileSync(fullPath, node.content || '');
      }
    }

    // 3. Figure out exactly what Docker needs to run
    const activeFilePath = getRelativePath(activeFileId).replace(/\\/g, '/'); 
    const language = activeFile.language;
    
    // ✨ The Security Constraints
    // - memory="256m" -> Kills script if RAM spikes (memory leak protection)
    // - cpus="0.5" -> Restricts CPU hogging
    // - network none -> Blocks scripts from downloading malware or DDoS-ing targets
    const securityFlags = `--memory="256m" --cpus="0.5" --network none`;
    const dockerMount = `-v "${baseDir}:/sandbox"`;
    let command;

    if (language === 'javascript') {
      command = `docker run --rm ${securityFlags} ${dockerMount} code-nexus-runner node "/sandbox/${activeFilePath}"`;
    } else if (language === 'python') {
      command = `docker run --rm ${securityFlags} ${dockerMount} code-nexus-runner python3 "/sandbox/${activeFilePath}"`;
    } else if (language === 'c') {
      command = `docker run --rm ${securityFlags} ${dockerMount} code-nexus-runner sh -c "gcc /sandbox/${activeFilePath} -o /sandbox/output.out && /sandbox/output.out"`;
    } else if (language === 'cpp') {
      command = `docker run --rm ${securityFlags} ${dockerMount} code-nexus-runner sh -c "g++ /sandbox/${activeFilePath} -o /sandbox/output.out && /sandbox/output.out"`;
    } else if (language === 'java') {
      command = `docker run --rm ${securityFlags} ${dockerMount} code-nexus-runner java "/sandbox/${activeFilePath}"`;
    } else if (language === 'php') {
      // ✨ Added PHP Support
      command = `docker run --rm ${securityFlags} ${dockerMount} code-nexus-runner php "/sandbox/${activeFilePath}"`;
    } else if (language === 'go') {
      // ✨ Added Go Support (Compiles to a temporary location inside the container, then runs)
      command = `docker run --rm ${securityFlags} ${dockerMount} code-nexus-runner sh -c "go build -o /tmp/app.out /sandbox/${activeFilePath} && /tmp/app.out"`;
    } else if (language === 'rust') {
      // ✨ Added Rust Support (Compiles with rustc, then executes the binary)
      command = `docker run --rm ${securityFlags} ${dockerMount} code-nexus-runner sh -c "rustc /sandbox/${activeFilePath} --out-dir /tmp && /tmp/$(basename "${activeFilePath}" .rs)"`;
    } else if (language === 'ruby') {
      // ✨ Added Ruby Support
      command = `docker run --rm ${securityFlags} ${dockerMount} code-nexus-runner ruby "/sandbox/${activeFilePath}"`;
    } else {
      return res.status(400).json({ output: 'Unsupported language' });
    }

    // 4. Run the code! 
    // ✨ Added { timeout: 5000 } to forcefully kill infinite loops after 5 seconds
    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      
      // 5. SECURE CLEANUP: Instantly delete the entire temporary project folder
      if (fs.existsSync(baseDir)) {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }

      // ✨ Handle the specific timeout error gracefully so the user knows what happened
      if (error) {
          if (error.killed) {
              return res.status(400).json({ output: "❌ FATAL ERROR: Execution timed out (Exceeded 5 second limit). You may have an infinite loop." });
          }
          return res.status(400).json({ output: stderr || error.message });
      }

      if (stderr) return res.status(400).json({ output: stderr });

      res.json({ output: stdout });
    });

  } catch (err) {
    if (fs.existsSync(baseDir)) {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
    res.status(500).json({ output: 'Execution server error', error: err.message });
  }
};

module.exports = { executeCode };