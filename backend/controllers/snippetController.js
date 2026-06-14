const Snippet = require('../models/Snippet');

// Create a new snippet
// Create a new snippet (Project)
const createSnippet = async (req, res) => {
  try {
    // 👇 We now extract 'files' from the request instead of 'code' and 'language'
    const { title, files, author } = req.body; 
    
    const snippet = await Snippet.create({ 
      title, 
      files, // 👈 Save the array to the database
      author 
    });
    
    return res.status(201).json(snippet);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to save project', error: error.message });
  }
};
// Get snippets (Filtered by User)
const getSnippets = async (req, res) => {
  try {
    const { author } = req.query; 
    let query = {};
    
    // 👈 If an author is provided in the URL, only fetch their snippets
    if (author) {
      query.author = author;
    }

    const snippets = await Snippet.find(query).sort({ createdAt: -1 });
    return res.json(snippets);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch snippets', error: error.message });
  }
};

// Get a single snippet by id (Kept from your old code!)
const getSnippetById = async (req, res) => {
  try {
    const snippet = await Snippet.findById(req.params.id);
    if (!snippet) {
      return res.status(404).json({ message: 'Snippet not found' });
    }
    return res.json(snippet);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createSnippet,
  getSnippets,
  getSnippetById,
};