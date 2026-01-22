// Bible App - Main Application
class BibleApp {
    constructor() {
        this.currentBook = null;
        this.currentChapter = 1;
        this.currentVerse = 1;
        this.annotations = [];
        this.notes = [];
        this.selectedText = '';
        this.drawingMode = false;
        this.aiService = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.initializeDrawing();
        this.loadBibleBooks();
        this.loadSavedData();
        this.setupGoogleDrive();
        this.initializeAI();
        
        // Load default view
        await this.loadBibleText('Genesis', 1);
    }
    
    setupEventListeners() {
        // Navigation
        document.getElementById('menuBtn').addEventListener('click', () => this.togglePanel('left'));
        document.getElementById('aiBtn').addEventListener('click', () => this.togglePanel('right'));
        document.getElementById('notesBtn').addEventListener('click', () => this.toggleNotesPanel());
        document.getElementById('syncBtn').addEventListener('click', () => this.openSyncModal());
        
        // Bible navigation
        document.getElementById('goBtn').addEventListener('click', () => this.navigateTo());
        document.getElementById('bookSelect').addEventListener('change', (e) => {
            if (e.target.value) this.loadBibleText(e.target.value, 1);
        });
        
        // Drawing tools
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectTool(e.target.dataset.tool));
        });
        
        // AI Service selection
        document.getElementById('aiService').addEventListener('change', (e) => {
            this.configureAIService(e.target.value);
        });
        
        document.getElementById('askAiBtn').addEventListener('click', () => this.queryAI());
        
        // Notes
        document.getElementById('saveNoteBtn').addEventListener('click', () => this.saveNote());
        document.getElementById('clearNoteBtn').addEventListener('click', () => this.clearNoteCanvas());
        
        // Sync
        document.getElementById('googleSignInBtn').addEventListener('click', () => this.signInGoogle());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportNotes());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', (e) => this.importNotes(e));
        
        // Text selection
        document.getElementById('pageContent').addEventListener('mouseup', () => this.handleTextSelection());
        document.getElementById('pageContent').addEventListener('touchend', () => this.handleTextSelection());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Page swipe gestures for navigation
        this.setupSwipeGestures();
    }
    
    loadBibleBooks() {
        const books = [
            // Old Testament
            'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
            'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
            '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
            'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
            'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
            'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
            'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
            'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
            // New Testament
            'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
            '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
            'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
            '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
            'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
            'Jude', 'Revelation'
        ];
        
        const bookSelect = document.getElementById('bookSelect');
        const bookList = document.getElementById('bookList');
        
        books.forEach(book => {
            // Add to dropdown
            const option = document.createElement('option');
            option.value = book;
            option.textContent = book;
            bookSelect.appendChild(option);
            
            // Add to side panel
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';
            bookItem.textContent = book;
            bookItem.onclick = () => {
                this.loadBibleText(book, 1);
                this.togglePanel('left');
            };
            bookList.appendChild(bookItem);
        });
    }
    
    async loadBibleText(book, chapter) {
        const pageContent = document.getElementById('pageContent');
        pageContent.innerHTML = '<div class="loading-message">Loading Bible text...</div>';
        
        try {
            // Using ESV API (free tier available)
            const response = await fetch(`https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(book)}+${chapter}`, {
                headers: {
                    'Authorization': 'Token ' + (localStorage.getItem('esvApiKey') || 'YOUR_DEFAULT_TOKEN')
                }
            });
            
            if (!response.ok) {
                // Fallback to local sample text or alternative API
                this.loadSampleText(book, chapter);
                return;
            }
            
            const data = await response.json();
            this.renderBibleText(data.passages[0], book, chapter);
            
        } catch (error) {
            console.error('Error loading Bible text:', error);
            this.loadSampleText(book, chapter);
        }
        
        this.currentBook = book;
        this.currentChapter = chapter;
        document.getElementById('bookSelect').value = book;
        document.getElementById('chapterInput').value = chapter;
        
        // Load annotations for this chapter
        this.loadAnnotations(book, chapter);
    }
    
    loadSampleText(book, chapter) {
        // Sample text for demonstration
        const sampleTexts = {
            'Genesis': {
                1: `<h2 class="chapter-title">${book} ${chapter}</h2>
                    <span class="verse" data-verse="1"><span class="verse-number">1</span>In the beginning God created the heaven and the earth.</span>
                    <span class="verse" data-verse="2"><span class="verse-number">2</span>And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.</span>
                    <span class="verse" data-verse="3"><span class="verse-number">3</span>And God said, Let there be light: and there was light.</span>
                    <span class="verse" data-verse="4"><span class="verse-number">4</span>And God saw the light, that it was good: and God divided the light from the darkness.</span>
                    <span class="verse" data-verse="5"><span class="verse-number">5</span>And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.</span>`
            },
            'John': {
                3: `<h2 class="chapter-title">${book} ${chapter}</h2>
                    <span class="verse" data-verse="16"><span class="verse-number">16</span>For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.</span>
                    <span class="verse" data-verse="17"><span class="verse-number">17</span>For God sent not his Son into the world to condemn the world; but that the world through him might be saved.</span>`
            }
        };
        
        const pageContent = document.getElementById('pageContent');
        pageContent.innerHTML = sampleTexts[book]?.[chapter] || 
            `<h2 class="chapter-title">${book} ${chapter}</h2><p>Sample text for ${book} chapter ${chapter}. Connect to a Bible API for full text.</p>`;
    }
    
    renderBibleText(text, book, chapter) {
        const pageContent = document.getElementById('pageContent');
        
        // Parse and format the text with verse numbers
        const formattedText = text.replace(/\[(\d+)\]/g, '<span class="verse" data-verse="$1"><span class="verse-number">$1</span>');
        
        pageContent.innerHTML = `
            <h2 class="chapter-title">${book} ${chapter}</h2>
            <div class="bible-text">${formattedText}</div>
        `;
        
        // Add click handlers to verses
        document.querySelectorAll('.verse').forEach(verse => {
            verse.addEventListener('click', (e) => this.selectVerse(e.target));
        });
    }
    
    selectVerse(verseElement) {
        // Remove previous selection
        document.querySelectorAll('.verse.selected').forEach(v => v.classList.remove('selected'));
        
        // Add selection
        verseElement.classList.add('selected');
        
        // Update selected text display
        const verseText = verseElement.textContent;
        const verseNum = verseElement.dataset.verse;
        this.selectedText = `${this.currentBook} ${this.currentChapter}:${verseNum} - ${verseText}`;
        
        document.getElementById('selectedText').textContent = this.selectedText;
    }
    
    handleTextSelection() {
        const selection = window.getSelection();
        if (selection.toString().trim()) {
            this.selectedText = selection.toString();
            document.getElementById('selectedText').textContent = this.selectedText;
        }
    }
    
    navigateTo() {
        const book = document.getElementById('bookSelect').value;
        const chapter = parseInt(document.getElementById('chapterInput').value) || 1;
        const verse = parseInt(document.getElementById('verseInput').value) || 1;
        
        if (book) {
            this.loadBibleText(book, chapter);
            // Scroll to verse after loading
            setTimeout(() => {
                const verseElement = document.querySelector(`.verse[data-verse="${verse}"]`);
                if (verseElement) {
                    verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    this.selectVerse(verseElement);
                }
            }, 500);
        }
    }
    
    togglePanel(side) {
        const panel = side === 'left' ? 
            document.getElementById('leftPanel') : 
            document.getElementById('rightPanel');
        
        panel.classList.toggle('open');
    }
    
    toggleNotesPanel() {
        document.getElementById('notesPanel').classList.toggle('open');
        if (document.getElementById('notesPanel').classList.contains('open')) {
            this.initializeNoteCanvas();
        }
    }
    
    openSyncModal() {
        document.getElementById('syncModal').classList.add('open');
    }
    
    closeSyncModal() {
        document.getElementById('syncModal').classList.remove('open');
    }
    
    selectTool(tool) {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.tool-btn[data-tool="${tool}"]`).classList.add('active');
        
        if (window.drawingController) {
            window.drawingController.setTool(tool);
        }
    }
    
    setupSwipeGestures() {
        let touchStartX = 0;
        let touchEndX = 0;
        
        const container = document.getElementById('bibleContainer');
        
        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });
        
        this.handleSwipe = () => {
            const swipeDistance = touchEndX - touchStartX;
            const minSwipeDistance = 50;
            
            if (Math.abs(swipeDistance) > minSwipeDistance) {
                if (swipeDistance > 0) {
                    // Swipe right - previous chapter
                    this.navigateChapter(-1);
                } else {
                    // Swipe left - next chapter
                    this.navigateChapter(1);
                }
            }
        };
    }
    
    navigateChapter(direction) {
        const newChapter = this.currentChapter + direction;
        if (newChapter > 0) {
            this.loadBibleText(this.currentBook, newChapter);
        }
    }
    
    handleKeyboardShortcuts(e) {
        // Cmd/Ctrl + S: Save
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            this.saveAllData();
        }
        
        // Cmd/Ctrl + Z: Undo
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (window.drawingController) {
                window.drawingController.undo();
            }
        }
        
        // Arrow keys: Navigate chapters
        if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea')) {
            this.navigateChapter(-1);
        } else if (e.key === 'ArrowRight' && !e.target.matches('input, textarea')) {
            this.navigateChapter(1);
        }
    }
    
    configureAIService(service) {
        const apiKeyInput = document.getElementById('apiKey');
        const endpointInput = document.getElementById('apiEndpoint');
        
        if (service === 'custom' || service === 'local') {
            endpointInput.style.display = 'block';
        } else {
            endpointInput.style.display = 'none';
        }
        
        this.aiService = service;
    }
    
    async queryAI() {
        const query = document.getElementById('aiQuery').value;
        const responseDiv = document.getElementById('aiResponse');
        
        if (!query || !this.selectedText) {
            responseDiv.textContent = 'Please select a verse and enter a question.';
            return;
        }
        
        responseDiv.textContent = 'Researching...';
        
        try {
            const response = await this.callAIService(query, this.selectedText);
            responseDiv.textContent = response;
        } catch (error) {
            responseDiv.textContent = 'Error: ' + error.message;
        }
    }
    
    async callAIService(query, context) {
        const service = this.aiService || 'openai';
        const apiKey = document.getElementById('apiKey').value;
        
        if (!apiKey && service !== 'local') {
            throw new Error('Please enter your API key');
        }
        
        const prompt = `Context: ${context}\n\nQuestion: ${query}\n\nPlease provide a thoughtful biblical analysis:`;
        
        switch (service) {
            case 'openai':
                return await this.callOpenAI(prompt, apiKey);
            case 'anthropic':
                return await this.callAnthropic(prompt, apiKey);
            case 'local':
            case 'custom':
                return await this.callCustomEndpoint(prompt);
            default:
                throw new Error('Unknown AI service');
        }
    }
    
    async callOpenAI(prompt, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500
            })
        });
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    async callAnthropic(prompt, apiKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-opus-20240229',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500
            })
        });
        
        const data = await response.json();
        return data.content[0].text;
    }
    
    async callCustomEndpoint(prompt) {
        const endpoint = document.getElementById('apiEndpoint').value;
        if (!endpoint) {
            throw new Error('Please enter the custom endpoint URL');
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        
        const data = await response.json();
        return data.response || data.text || JSON.stringify(data);
    }
    
    saveNote() {
        const title = document.getElementById('noteTitle').value || 'Untitled Note';
        const canvas = document.getElementById('noteCanvas');
        const dataURL = canvas.toDataURL();
        
        const note = {
            id: Date.now(),
            title,
            verse: this.selectedText,
            book: this.currentBook,
            chapter: this.currentChapter,
            content: dataURL,
            timestamp: new Date().toISOString()
        };
        
        this.notes.push(note);
        this.displayNotesList();
        this.saveToLocalStorage();
        
        // Clear the note editor
        document.getElementById('noteTitle').value = '';
        this.clearNoteCanvas();
    }
    
    displayNotesList() {
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = '';
        
        this.notes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            noteItem.innerHTML = `
                <strong>${note.title}</strong><br>
                <small>${note.book} ${note.chapter}</small><br>
                <small>${new Date(note.timestamp).toLocaleDateString()}</small>
            `;
            noteItem.onclick = () => this.loadNote(note);
            notesList.appendChild(noteItem);
        });
    }
    
    loadNote(note) {
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('selectedText').textContent = note.verse;
        
        const canvas = document.getElementById('noteCanvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = note.content;
    }
    
    clearNoteCanvas() {
        const canvas = document.getElementById('noteCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    initializeNoteCanvas() {
        const canvas = document.getElementById('noteCanvas');
        if (!canvas.hasAttribute('data-initialized')) {
            new DrawingController(canvas);
            canvas.setAttribute('data-initialized', 'true');
        }
    }
    
    loadSavedData() {
        const savedNotes = localStorage.getItem('bibleNotes');
        if (savedNotes) {
            this.notes = JSON.parse(savedNotes);
            this.displayNotesList();
        }
        
        const savedAnnotations = localStorage.getItem('bibleAnnotations');
        if (savedAnnotations) {
            this.annotations = JSON.parse(savedAnnotations);
        }
    }
    
    saveToLocalStorage() {
        localStorage.setItem('bibleNotes', JSON.stringify(this.notes));
        localStorage.setItem('bibleAnnotations', JSON.stringify(this.annotations));
    }
    
    saveAllData() {
        this.saveToLocalStorage();
        if (this.isGoogleSignedIn) {
            this.saveToGoogleDrive();
        }
        
        // Show save confirmation
        const status = document.createElement('div');
        status.className = 'save-status';
        status.textContent = 'Saved!';
        status.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            z-index: 1000;
        `;
        document.body.appendChild(status);
        setTimeout(() => status.remove(), 2000);
    }
    
    exportNotes() {
        const data = {
            notes: this.notes,
            annotations: this.annotations,
            exported: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bible-study-notes-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }
    
    importNotes(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                this.notes = data.notes || [];
                this.annotations = data.annotations || [];
                this.displayNotesList();
                this.saveToLocalStorage();
                alert('Notes imported successfully!');
            } catch (error) {
                alert('Error importing notes: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
    
    setupGoogleDrive() {
        // This will be implemented in storage.js
        if (window.GoogleDriveStorage) {
            this.storage = new GoogleDriveStorage();
        }
    }
    
    signInGoogle() {
        if (this.storage) {
            this.storage.signIn().then(() => {
                document.getElementById('googleStatus').textContent = 'Connected to Google Drive';
                this.isGoogleSignedIn = true;
            });
        }
    }
    
    saveToGoogleDrive() {
        if (this.storage && this.isGoogleSignedIn) {
            const data = {
                notes: this.notes,
                annotations: this.annotations
            };
            this.storage.saveFile('bible-study-notes.json', JSON.stringify(data));
        }
    }
    
    loadAnnotations(book, chapter) {
        const key = `${book}-${chapter}`;
        const chapterAnnotations = this.annotations.filter(a => a.key === key);
        
        if (chapterAnnotations.length > 0 && window.drawingController) {
            window.drawingController.loadAnnotations(chapterAnnotations);
        }
    }
    
    initializeDrawing() {
        const canvas = document.getElementById('annotationCanvas');
        window.drawingController = new DrawingController(canvas);
        
        // Enable drawing mode toggle
        canvas.classList.add('active');
    }
    
    initializeAI() {
        // Set default AI service
        this.aiService = 'openai';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.bibleApp = new BibleApp();
});

// Helper function for panels
function togglePanel(side) {
    window.bibleApp.togglePanel(side);
}

function toggleNotesPanel() {
    window.bibleApp.toggleNotesPanel();
}

function closeSyncModal() {
    window.bibleApp.closeSyncModal();
}