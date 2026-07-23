const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extracts Google Drive file ID and converts to a direct download URL.
 * If not a Drive URL, returns the original URL.
 * @param {string} url 
 * @returns {string} 
 */
const getDirectImageUrl = (url) => {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    
    // Handle standard drive URLs like https://drive.google.com/file/d/<ID>/view
    if (urlObj.hostname === 'drive.google.com') {
      const match = url.match(/\/d\/([^/]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/uc?id=${match[1]}&export=download`;
      }
      
      // Handle drive URLs like https://drive.google.com/open?id=<ID>
      const id = urlObj.searchParams.get('id');
      if (id) {
        return `https://drive.google.com/uc?id=${id}&export=download`;
      }
    }
    
    return url;
  } catch (err) {
    // Invalid URL
    return url;
  }
};

/**
 * Uploads an image from a URL to Cloudinary and returns the secure URL.
 * @param {string} url 
 * @param {string} folder 
 * @returns {Promise<string|null>} 
 */
const uploadImageFromUrl = async (url, folder = 'auction_players') => {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return url; // Return original if not a valid HTTP URL
  }

  const fetchUrl = getDirectImageUrl(url);
  
  // Extract the Google Drive ID to use as a unique identifier (public_id)
  let public_id = undefined;
  const match = fetchUrl.match(/id=([^&]+)/);
  if (match && match[1]) {
    public_id = match[1];
  }
  
  try {
    const result = await cloudinary.uploader.upload(fetchUrl, {
      folder,
      public_id,
      overwrite: true,
      timeout: 60000 // 60 seconds timeout
    });
    console.log(`✅ Successfully uploaded to Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (err) {
    logger.error(`Cloudinary upload failed for ${fetchUrl}: ${err.message}`);
    // Fallback to original URL if upload fails
    return url; 
  }
};

module.exports = {
  cloudinary,
  uploadImageFromUrl,
  getDirectImageUrl
};
