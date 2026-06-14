const mongoose = require('mongoose');

const snippetSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    default: "Untitled Project"
  },
  author: { 
    type: String, 
    required: true // This ties the project to the specific user!
  },
  files: { 
    type: Array, 
    default: [] // This allows MongoDB to save your entire File Explorer tree
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Snippet', snippetSchema);