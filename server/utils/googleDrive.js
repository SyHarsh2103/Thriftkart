const { google } = require("googleapis");
const fs = require("fs");
const path = require("path"); 

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../service_account.json'),  // Ensure path is correct
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

const uploadToDrive = async (filePath, filename, folderId) => {
  const fileMetadata = {
    name: filename,
    parents: [folderId],
  };
  const media = {
    mimeType: 'image/jpeg',
    body: fs.createReadStream(filePath),
  };
  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
  });

  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return file.data.webContentLink; 
};


module.exports = { uploadToDrive };
