// Storage system for TikTok/IG downloads
const fs = require('fs-extra');
const path = require('path');

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
const MAX_SIZE_MB = 25; // Discord limit
const MAX_FILES = 50;

class Storage {
  constructor() {
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }
  }

  async save(buffer, filename, userId) {
    const timestamp = Date.now();
    const userDir = path.join(DOWNLOADS_DIR, userId.toString());
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    const fullPath = path.join(userDir, `${timestamp}_${filename}`);
    
    await fs.writeFile(fullPath, buffer);
    
    // Cleanup old files
    this.cleanup(userDir);
    
    return fullPath;
  }

  async getFile(fullPath) {
    if (!fs.existsSync(fullPath)) throw new Error('File not found');
    
    const stats = fs.statSync(fullPath);
    if (stats.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error('File too large >25MB');
    }
    
    const buffer = await fs.readFile(fullPath);
    return { buffer, path: fullPath, name: path.basename(fullPath) };
  }

  cleanup(dir) {
    const files = fs.readdirSync(dir);
    if (files.length > MAX_FILES) {
      files.sort((a, b) => fs.statSync(path.join(dir, b)).mtime.getTime() - fs.statSync(path.join(dir, a)).mtime.getTime());
      for (let i = MAX_FILES; i < files.length; i++) {
        fs.unlinkSync(path.join(dir, files[i]));
      }
    }
  }

  async delete(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  list(userId) {
    const userDir = path.join(DOWNLOADS_DIR, userId.toString());
    if (!fs.existsSync(userDir)) return [];
    return fs.readdirSync(userDir);
  }
}

module.exports = new Storage();
