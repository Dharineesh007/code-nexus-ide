import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Folder, FolderOpen, FileCode, Play, Save, Layout, 
  Terminal, LogOut, Plus, X, MonitorPlay, Code2,
  User, Mail, Lock, Sparkles, AlertTriangle
} from 'lucide-react';
import './index.css'; 

export default function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- AUTHENTICATION ---
  const [currentUser, setCurrentUser] = useState(sessionStorage.getItem('currentUser') || '');
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'register' ? 'register' : 'login';
      const payload = authMode === 'register' ? { username, email, password } : { username, password };
      const response = await axios.post(`http://localhost:5000/api/auth/${endpoint}`, payload);
      
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('currentUser', response.data.username);
      setCurrentUser(response.data.username);
      toast.success(`${authMode === 'register' ? 'Registration' : 'Login'} successful!`);

      // ✨ NEW: Auto-load the user's most recent project upon login
      try {
        const projectRes = await axios.get(`http://localhost:5000/api/snippets?author=${response.data.username}`);
        
        // If they have saved projects, load the most recent one (index 0)
        if (projectRes.data && projectRes.data.length > 0) {
          const latestProject = projectRes.data[0];
          setTitle(latestProject.title);
          
          if (latestProject.files && latestProject.files.length > 0) {
            setFiles(latestProject.files);
            
            // Find the first actual file (not a folder) to open in the editor
            const firstFile = latestProject.files.find(f => f.type === 'file');
            if (firstFile) {
              setActiveFileId(firstFile.id);
              setSelectedNodeId(firstFile.id);
            }
          }
        }
      } catch (fetchErr) {
        console.error("Could not auto-load recent project:", fetchErr);
      }

    } catch (error) {
      toast.error(error.response?.data?.message || 'Authentication failed.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('token');
    setCurrentUser(''); setUsername(''); setPassword('');
    setAuthMode('login'); 

    setTitle('My First App');
    setFiles([
      { id: 'root-folder', name: 'src', type: 'folder', parentId: null, isOpen: true },
      { id: 'main-file', name: 'main.py', type: 'file', parentId: 'root-folder', language: 'python', content: 'print("Welcome to Code_Nexus!")\n' }
    ]);
    setActiveFileId('main-file');
    setSelectedNodeId(null);
    setOutput('// Output will appear here...');
    setMainView('editor'); 
  };

  // --- WORKSPACE STATE ---
  const [title, setTitle] = useState('My First App');
  const [mainView, setMainView] = useState('editor'); 
  const [viewMode, setViewMode] = useState('console'); 
  const [output, setOutput] = useState('// Output will appear here...');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [savedSnippets, setSavedSnippets] = useState([]);
  
  const [nodeToDelete, setNodeToDelete] = useState(null); 

  const [files, setFiles] = useState([
    { id: 'root-folder', name: 'src', type: 'folder', parentId: null, isOpen: true },
    { id: 'main-file', name: 'main.py', type: 'file', parentId: 'root-folder', language: 'python', content: 'print("Welcome to Code_Nexus!")\n' }
  ]);
  
  const [activeFileId, setActiveFileId] = useState('main-file');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [newItemName, setNewItemName] = useState('');

  const activeFile = files.find(f => f.id === activeFileId) || null;

  const getLanguageFromExtension = (filename) => {
  if (filename.endsWith('.js')) return 'javascript';
  if (filename.endsWith('.py')) return 'python';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.java')) return 'java';
  if (filename.endsWith('.cpp')) return 'cpp';
  if (filename.endsWith('.c')) return 'c';
  if (filename.endsWith('.php')) return 'php'; 
  if (filename.endsWith('.go')) return 'go';   
  if (filename.endsWith('.rs')) return 'rust'; 
  if (filename.endsWith('.rb')) return 'ruby'; 
  return 'plaintext';
};

  // --- FILE TREE LOGIC ---
  const handleNodeClick = (node) => {
    setSelectedNodeId(node.id);
    if (node.type === 'file') {
      setActiveFileId(node.id);
    } else {
      setFiles(files.map(f => f.id === node.id ? { ...f, isOpen: !f.isOpen } : f));
    }
  };

  const handleCreateNode = (e, type) => {
    e.preventDefault();
    if (!newItemName.trim()) return toast.error(`Please type a name for the new ${type}!`);

    let targetParentId = null;
    const selectedNode = files.find(f => f.id === selectedNodeId);
    if (selectedNode) targetParentId = selectedNode.type === 'folder' ? selectedNode.id : selectedNode.parentId;

    const newNode = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      type: type,
      parentId: targetParentId,
      content: type === 'file' ? '' : undefined,
      language: type === 'file' ? getLanguageFromExtension(newItemName.trim()) : undefined,
      isOpen: type === 'folder' ? true : undefined
    };

    const updatedFiles = files.map(f => f.id === targetParentId ? { ...f, isOpen: true } : f);
    setFiles([...updatedFiles, newNode]);
    setNewItemName('');
    
    if (type === 'file') {
      setActiveFileId(newNode.id);
      setSelectedNodeId(newNode.id);
    }
  };

  const handleDeleteClick = (e, node) => {
    e.stopPropagation();
    setNodeToDelete(node);
  };

  const confirmDelete = () => {
    if (!nodeToDelete) return;

    const getChildrenIds = (parentId) => {
      const children = files.filter(f => f.parentId === parentId);
      let ids = children.map(c => c.id);
      children.forEach(c => { ids = [...ids, ...getChildrenIds(c.id)] });
      return ids;
    };
    
    const idsToRemove = [nodeToDelete.id, ...getChildrenIds(nodeToDelete.id)];
    const newFiles = files.filter(f => !idsToRemove.includes(f.id));
    
    setFiles(newFiles);
    
    if (idsToRemove.includes(activeFileId)) setActiveFileId(null);
    if (idsToRemove.includes(selectedNodeId)) setSelectedNodeId(null);
    
    toast.success(`${nodeToDelete.name} deleted`);
    setNodeToDelete(null); 
  };

  const handleEditorChange = (value) => {
    setFiles(files.map(f => f.id === activeFileId ? { ...f, content: value } : f));
  };

  const renderTree = (parentId = null, depth = 0) => {
    return files
      .filter(f => f.parentId === parentId)
      .sort((a, b) => a.type === 'folder' ? -1 : 1)
      .map(node => {
        const isSelected = selectedNodeId === node.id;
        const isActive = activeFileId === node.id;

        return (
          <div key={node.id}>
            <div 
              onClick={() => handleNodeClick(node)}
              className={`tree-node ${isActive ? 'active' : ''}`}
              style={{ paddingLeft: `${depth * 16 + 12}px` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {node.type === 'folder' ? (
                  node.isOpen ? <FolderOpen size={16} /> : <Folder size={16} />
                ) : (
                  <FileCode size={16} />
                )}
                <span>{node.name}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteClick(e, node)} 
                className="icon-btn" 
                style={{ opacity: isSelected ? 1 : 0 }}
              >
                <X size={14} />
              </button>
            </div>
            {node.type === 'folder' && node.isOpen && renderTree(node.id, depth + 1)}
          </div>
        );
      });
  };

  // --- API CALLS ---
  const fetchSnippets = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/snippets?author=${currentUser}`);
      setSavedSnippets(response.data);
    } catch (error) {
      toast.error('Could not load projects.');
    }
  };

  useEffect(() => {
    if (mainView === 'dashboard' && currentUser) fetchSnippets();
  }, [mainView, currentUser]);

  const handleSave = async () => {
    const savePromise = axios.post('http://localhost:5000/api/snippets', { title, files, author: currentUser });
    toast.promise(savePromise, { loading: 'Saving...', success: 'Project Saved!', error: 'Failed to save.' });
  };

  // ✨ NEW: The Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if Ctrl (Windows) or Cmd (Mac) + S is pressed
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Stop the browser's "Save Page As" menu
        
        // Only try to save if the user is actually logged in
        if (currentUser) {
          handleSave();
        }
      }
    };

    // Attach our listener to the window
    window.addEventListener('keydown', handleKeyDown);

    // Clean it up when the component closes so it doesn't run twice
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, files, currentUser]); // We tell React to keep these variables fresh

  const handleRunCode = async () => {
    if (!activeFile) return toast.error('Open a file to run it!');
    if (activeFile.language === 'html' || activeFile.language === 'css') return toast.error('Switch to Live Preview!');
    
    setIsCompiling(true);
    setOutput(`🚀 Initializing Docker Engine...\n⚙️ Compiling ${activeFile.name}...\n`);

    try {
      const response = await axios.post('http://localhost:5000/api/execute', { activeFileId: activeFile.id || activeFile._id, files });
      setOutput(`✅ Execution Complete:\n\n${response.data.output || 'No output.'}`);
      toast.success('Compiled successfully!');
    } catch (error) {
      setOutput(`❌ Runtime Error:\n\n${error.response?.data?.output || 'Server Error'}`);
      toast.error('Code execution failed.');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleAIDebug = async () => {
    if (!output || !output.toLowerCase().includes('error')) {
      toast.error("Your code looks clean! Trigger an error to use the AI Debugger.");
      return;
    }

    setIsAiLoading(true);
    const originalOutput = output; 
    setOutput(`${originalOutput}\n\n🤖 ✨ [AI DEBUG ASSISTANT]: Analyzing your code and error...`);

    try {
      const response = await axios.post('http://localhost:5000/api/ai-debug', {
        code: activeFile.content,
        errorOutput: originalOutput,
        language: activeFile.language,
      });

      setOutput(`${originalOutput}\n\n🤖 ✨ [AI DEBUG ASSISTANT]:\n${response.data.suggestion}`);
      toast.success("AI found a solution!");
    } catch (error) {
      console.error("Failed to fetch AI feedback:", error);
      setOutput(`${originalOutput}\n\n❌ Failed to connect to AI assistant.`);
      toast.error('AI Debugger failed to connect.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // =====================================================================
  // RENDER UI
  // =====================================================================
  if (!currentUser) {
    return (
      <div className="login-container">
        <Toaster position="top-center" />
        <form onSubmit={handleAuthSubmit} className="panel glass-panel" style={{ width: '400px', padding: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '20px', backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', marginBottom: '20px', boxShadow: '0 0 20px var(--accent-glow)' }}>
              <Code2 size={40} />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '2px', margin: '0 0 10px 0' }}>CODE_NEXUS</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '15px' }}>
              {authMode === 'login' ? 'Sign in to your secure workspace' : 'Create your developer account'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
            <div className="input-wrapper">
              <input className="input-field" type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              <User size={18} />
            </div>
            
            {authMode === 'register' && (
              <div className="input-wrapper">
                <input className="input-field" type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Mail size={18} />
              </div>
            )}

            <div className="input-wrapper">
              <input className="input-field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Lock size={18} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '16px', width: '100%', marginBottom: '24px' }}>
            {authMode === 'login' ? 'Access Playground' : 'Register Account'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); }} style={{ color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--text-main)'} onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}>
              {authMode === 'login' ? "New here? Create an account" : "Already have an account? Sign in"}
            </span>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
      <Toaster position="top-center" /> 

      {nodeToDelete && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="panel" style={{ padding: '32px', width: '380px', textAlign: 'center', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ color: 'var(--danger)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <AlertTriangle size={48} />
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px' }}>Delete {nodeToDelete.type === 'folder' ? 'Folder' : 'File'}?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete <strong>{nodeToDelete.name}</strong>? 
              {nodeToDelete.type === 'folder' && ' This will also delete all files inside it.'}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setNodeToDelete(null)} className="btn btn-ghost" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              <button onClick={confirmDelete} className="btn" style={{ flex: 1, padding: '10px', backgroundColor: 'var(--danger)', color: 'white', border: 'none' }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
      
      {/* TOP NAVBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent)' }}>
          <Code2 size={24} />
          <h2 style={{ margin: 0, fontWeight: '700', letterSpacing: '1px', fontSize: '18px' }}>CODE_NEXUS</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setMainView('editor')} className={`btn ${mainView === 'editor' ? 'btn-primary' : 'btn-ghost'}`}>
            <Layout size={16} /> <span style={{ display: isMobile ? 'none' : 'inline' }}>Editor</span>
          </button>
          <button onClick={() => setMainView('dashboard')} className={`btn ${mainView === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}>
            <Folder size={16} /> <span style={{ display: isMobile ? 'none' : 'inline' }}>Workspace</span>
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 8px' }}></div>
          <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '8px' }} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', padding: '16px', gap: '16px', overflow: isMobile ? 'auto' : 'hidden' }}>
        
        {mainView === 'dashboard' ? (
          <div className="panel" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
            <h1 style={{ marginBottom: '32px', fontSize: '28px' }}>My Saved Projects</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {savedSnippets.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No projects saved yet.</p> : null}
              {savedSnippets.map((snippet) => (
                <div key={snippet._id} className="panel" style={{ padding: '24px', cursor: 'pointer', transition: '0.2s' }} onClick={() => { setTitle(snippet.title); setFiles(snippet.files && snippet.files.length > 0 ? snippet.files : [{ id: 'legacy', name: 'main.txt', type: 'file', parentId: null, language: snippet.language, content: snippet.code || '' }]); setMainView('editor'); toast.success(`Loaded ${snippet.title}`); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--accent)' }}>
                    <FolderOpen size={24} />
                    <h3 style={{ margin: 0, fontSize: '18px' }}>{snippet.title}</h3>
                  </div>
                  <span style={{ backgroundColor: 'var(--bg-base)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {snippet.files ? snippet.files.length : 1} File(s)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <>
          {/* SIDEBAR EXPLORER */}
          <div className="panel" style={{ width: isMobile ? '100%' : '280px', minHeight: isMobile ? '350px' : 'auto' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', letterSpacing: '1px', color: 'var(--text-muted)' }}>EXPLORER</span>
              <button onClick={() => setSelectedNodeId(null)} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }}>Deselect</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
              {renderTree(null, 0)} 
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-base)' }}>
              <input type="text" className="input-field" placeholder="Filename (e.g. app.js)" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} style={{ marginBottom: '12px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={(e) => handleCreateNode(e, 'file')} className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--border)' }}><Plus size={14}/> File</button>
                <button onClick={(e) => handleCreateNode(e, 'folder')} className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--border)' }}><Plus size={14}/> Folder</button>
              </div>
            </div>
          </div>

          {/* EDITOR PANEL */}
          <div className="panel" style={{ flex: 1, minHeight: isMobile ? '400px' : 'auto' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCode size={18} /> {activeFile ? activeFile.name : 'No file open'}
                </span>
                <input className="input-field" type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: isMobile ? '140px' : '220px', padding: '6px 12px' }} />
              </div>
              <button onClick={handleSave} className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={16} /> Save
              </button>
            </div>
            <div style={{ flex: 1, backgroundColor: '#1e1e1e', paddingTop: '8px' }}>
              {activeFile ? (
                <Editor height="100%" language={activeFile.language} value={activeFile.content} theme="vs-dark" onChange={handleEditorChange} options={{ minimap: { enabled: false }, fontSize: 15, padding: { top: 16 }, automaticLayout: true }} />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Select a file to start editing</div>
              )}
            </div>
          </div>

          {/* CONSOLE / PREVIEW PANEL */}
          <div className="panel" style={{ width: isMobile ? '100%' : '400px', minHeight: isMobile ? '300px' : 'auto' }}>
            
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
              
              <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-base)', padding: '4px', borderRadius: '8px' }}>
                <button 
                  onClick={() => setViewMode('preview')} 
                  className={`btn ${viewMode === 'preview' ? '' : 'btn-ghost'}`} 
                  style={{ 
                    backgroundColor: viewMode === 'preview' ? 'var(--bg-panel)' : 'transparent',
                    color: viewMode === 'preview' ? 'var(--text-main)' : 'var(--text-muted)',
                    padding: '6px 12px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: viewMode === 'preview' ? '0 2px 5px rgba(0,0,0,0.2)' : 'none'
                  }}
                >
                  <MonitorPlay size={14}/> Preview
                </button>
                <button 
                  onClick={() => setViewMode('console')} 
                  className={`btn ${viewMode === 'console' ? '' : 'btn-ghost'}`} 
                  style={{ 
                    backgroundColor: viewMode === 'console' ? 'var(--bg-panel)' : 'transparent',
                    color: viewMode === 'console' ? 'var(--text-main)' : 'var(--text-muted)',
                    padding: '6px 12px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: viewMode === 'console' ? '0 2px 5px rgba(0,0,0,0.2)' : 'none'
                  }}
                >
                  <Terminal size={14}/> Console
                </button>
              </div>

              {viewMode === 'console' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    onClick={handleAIDebug} 
                    disabled={isCompiling || isAiLoading || !activeFile} 
                    className="btn" 
                    style={{ 
                      background: isAiLoading ? 'var(--bg-base)' : 'linear-gradient(135deg, #8a2be2, #ff1493)', 
                      color: isAiLoading ? 'var(--text-muted)' : 'white', 
                      padding: '8px 14px', 
                      display: 'flex', alignItems: 'center', gap: '6px',
                      border: 'none',
                      fontWeight: 'bold',
                      boxShadow: isAiLoading ? 'none' : '0 4px 15px rgba(138, 43, 226, 0.3)',
                      cursor: (isCompiling || isAiLoading || !activeFile) ? 'not-allowed' : 'pointer',
                      opacity: (isCompiling || isAiLoading || !activeFile) ? 0.6 : 1
                    }}
                  >
                    <Sparkles size={14} />
                    {isAiLoading ? 'Thinking...' : 'Ask AI'}
                  </button>
                  <button 
                    onClick={handleRunCode} 
                    disabled={isCompiling || !activeFile} 
                    className="btn btn-primary" 
                    style={{ 
                      padding: '8px 16px', 
                      display: 'flex', alignItems: 'center', gap: '6px',
                      cursor: (isCompiling || !activeFile) ? 'not-allowed' : 'pointer',
                      opacity: (isCompiling || !activeFile) ? 0.6 : 1
                    }}
                  >
                    <Play size={14} fill="currentColor" /> 
                    {isCompiling ? 'Running...' : 'Run'}
                  </button>
                </div>
              )}
            </div>
            
            {viewMode === 'preview' ? (
              activeFile?.language === 'html' ? <iframe title="preview" srcDoc={activeFile.content} style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'white' }} /> : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Live preview is for HTML files.</div>
            ) : (
              <div style={{ flex: 1, backgroundColor: '#000', color: output.includes('❌') ? 'var(--danger)' : 'var(--success)', padding: '20px', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', whiteSpace: 'pre-wrap', overflowY: 'auto', borderTop: '1px solid var(--border)' }}>{output}</div>
            )}
          </div>
        </>
        )}
      </div>
    </div>
  );
}