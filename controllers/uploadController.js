const { uploadImageToImageKit } = require('../services/imagekitService');

const uploadMenuImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const base64File = req.file.buffer.toString('base64');
    const result = await uploadImageToImageKit({
      file: `data:${req.file.mimetype};base64,${base64File}`,
      fileName: req.file.originalname
    });

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully.',
      imageUrl: result.url,
      fileId: result.fileId,
      thumbnailUrl: result.thumbnailUrl
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadMenuImage };
