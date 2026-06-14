const express = require('express');
const router = express.Router();
const Snippet = require('../models/Snippet');

// ==========================================
// 📥 GET PROJECTS (For the logged-in user)
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { author } = req.query;
    
    // If no author is provided, send an empty array back
    if (!author) {
      return res.status(200).json([]);
    }

    // Find ONLY the projects created by this specific author, sorted by newest first
    const snippets = await Snippet.find({ author: author }).sort({ createdAt: -1 });
    res.status(200).json(snippets);
    
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// ==========================================
// 💾 SAVE PROJECT
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { title, files, author } = req.body;

    // Safety check
    if (!author) {
      return res.status(400).json({ message: "You must be logged in to save." });
    }

    // Create a new database entry
    const newSnippet = new Snippet({
      title,
      files,
      author
    });

    // Save it permanently to MongoDB
    await newSnippet.save();
    
    res.status(201).json({ message: "Saved successfully", snippet: newSnippet });
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ message: 'Server error while saving project' });
  }
});

module.exports = router;