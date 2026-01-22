// Drawing Controller for Apple Pencil support
class DrawingController {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.baseSize = 2;
        this.opacity = 1;
        this.pressure = 0.5;
        
        this.paths = [];
        this.currentPath = [];
        this.redoStack = [];
        
        this.setupCanvas();
        this.setupEventListeners();
    }
    
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Set canvas size to match container
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Redraw existing annotations
        this.redrawAll();
    }
    
    setupEventListeners() {
        // Pointer events for Apple Pencil
        this.canvas.addEventListener('pointerdown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('pointermove', (e) => this.draw(e));
        this.canvas.addEventListener('pointerup', (e) => this.stopDrawing(e));
        this.canvas.addEventListener('pointercancel', (e) => this.stopDrawing(e));
        this.canvas.addEventListener('pointerleave', (e) => this.stopDrawing(e));
        
        // Tool controls
        document.getElementById('colorPicker')?.addEventListener('change', (e) => {
            this.currentColor = e.target.value;
        });
        
        document.getElementById('sizeSlider')?.addEventListener('input', (e) => {
            this.baseSize = parseInt(e.target.value);
        });
        
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());
        document.getElementById('clearBtn')?.addEventListener('click', () => this.clear());
        
        // Prevent default touch behaviors
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }
    
    startDrawing(e) {
        if (!e.isPrimary) return;
        
        this.isDrawing = true;
        this.currentPath = [];
        this.redoStack = [];
        
        const point = this.getPoint(e);
        this.currentPath.push(point);
        
        // Start a new path for this stroke
        this.ctx.beginPath();
        this.ctx.moveTo(point.x, point.y);
    }
    
    draw(e) {
        if (!this.isDrawing || !e.isPrimary) return;
        
        e.preventDefault();
        const point = this.getPoint(e);
        this.currentPath.push(point);
        
        if (this.currentPath.length > 1) {
            const prevPoint = this.currentPath[this.currentPath.length - 2];
            this.drawSegment(prevPoint, point);
        }
    }
    
    stopDrawing(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        if (this.currentPath.length > 0) {
            this.paths.push({
                tool: this.currentTool,
                path: [...this.currentPath],
                color: this.currentColor,
                baseSize: this.baseSize
            });
            
            // Save to storage
            this.saveAnnotations();
        }
        
        this.currentPath = [];
    }
    
    getPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            pressure: e.pressure || 0.5,
            tiltX: e.tiltX || 0,
            tiltY: e.tiltY || 0,
            pointerType: e.pointerType,
            timestamp: Date.now()
        };
    }
    
    drawSegment(from, to) {
        this.ctx.save();
        
        // Configure drawing based on tool
        switch (this.currentTool) {
            case 'pen':
                this.drawPenStroke(from, to);
                break;
            case 'highlighter':
                this.drawHighlighter(from, to);
                break;
            case 'eraser':
                this.erase(from, to);
                break;
        }
        
        this.ctx.restore();
    }
    
    drawPenStroke(from, to) {
        // Calculate line width based on pressure
        let lineWidth = this.baseSize;
        if (to.pointerType === 'pen') {
            // Apple Pencil pressure sensitivity
            lineWidth = this.baseSize * (0.5 + to.pressure * 1.5);
            
            // Optional: Apply tilt for calligraphy effect
            if (Math.abs(to.tiltX) > 20 || Math.abs(to.tiltY) > 20) {
                const tiltFactor = 1 + (Math.abs(to.tiltX) + Math.abs(to.tiltY)) / 100;
                lineWidth *= tiltFactor;
            }
        }
        
        // Smooth line drawing with quadratic curves
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Use quadratic curve for smoother lines
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        
        this.ctx.quadraticCurveTo(from.x, from.y, midX, midY);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(midX, midY);
    }
    
    drawHighlighter(from, to) {
        this.ctx.globalAlpha = 0.3;
        this.ctx.lineWidth = this.baseSize * 5;
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineCap = 'square';
        this.ctx.lineJoin = 'miter';
        
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
    }
    
    erase(from, to) {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.lineWidth = this.baseSize * 5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        
        this.ctx.globalCompositeOperation = 'source-over';
    }
    
    setTool(tool) {
        this.currentTool = tool;
        
        // Update UI feedback
        if (tool === 'highlighter') {
            this.opacity = 0.3;
        } else {
            this.opacity = 1;
        }
    }
    
    undo() {
        if (this.paths.length > 0) {
            const lastPath = this.paths.pop();
            this.redoStack.push(lastPath);
            this.redrawAll();
            this.saveAnnotations();
        }
    }
    
    redo() {
        if (this.redoStack.length > 0) {
            const pathToRedo = this.redoStack.pop();
            this.paths.push(pathToRedo);
            this.redrawAll();
            this.saveAnnotations();
        }
    }
    
    clear() {
        if (confirm('Clear all annotations on this page?')) {
            this.paths = [];
            this.redoStack = [];
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.saveAnnotations();
        }
    }
    
    redrawAll() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (const pathData of this.paths) {
            const path = pathData.path;
            this.currentTool = pathData.tool;
            this.currentColor = pathData.color;
            this.baseSize = pathData.baseSize;
            
            for (let i = 1; i < path.length; i++) {
                this.drawSegment(path[i - 1], path[i]);
            }
        }
    }
    
    saveAnnotations() {
        if (!window.bibleApp) return;
        
        const key = `${window.bibleApp.currentBook}-${window.bibleApp.currentChapter}`;
        
        // Find existing annotation for this chapter
        const existingIndex = window.bibleApp.annotations.findIndex(a => a.key === key);
        
        const annotationData = {
            key,
            paths: this.paths,
            timestamp: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            window.bibleApp.annotations[existingIndex] = annotationData;
        } else {
            window.bibleApp.annotations.push(annotationData);
        }
        
        window.bibleApp.saveToLocalStorage();
    }
    
    loadAnnotations(annotations) {
        if (!annotations || annotations.length === 0) return;
        
        const annotation = annotations[0];
        this.paths = annotation.paths || [];
        this.redrawAll();
    }
    
    exportAsImage() {
        return this.canvas.toDataURL('image/png');
    }
    
    // Palm rejection for iPad
    isPalmTouch(e) {
        // Simple palm rejection based on touch area
        if (e.pointerType === 'touch' && e.width > 25 && e.height > 25) {
            return true;
        }
        return false;
    }
}

// Export for use in other modules
window.DrawingController = DrawingController;