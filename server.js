import http from 'node:http';
import { PassThrough } from 'node:stream';
import AWS from 'aws-sdk';
import formidable from 'formidable';

const s3Client = new AWS.S3({
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AREA_S3_ACCESS_KEY_ID,
    },
});

const uploadStream = (file) => {
    const pass = new PassThrough();
    s3Client.upload(
        {
            Bucket: 'forest-watcher-files',
            Key: `areas-staging/${file.newFilename}`,
            Body: pass,
        },
        (err, data) => {
            console.log(err, data);
        },
    );

    return pass;
};

const server = http.createServer((req, res) => {
    if (req.url === '/api/upload' && req.method.toLowerCase() === 'post') {
        // parse a file upload
        const form = formidable({
            fileWriteStreamHandler: uploadStream,
        });

        form.parse(req, () => {
            res.writeHead(200);
            res.end();
        });

        return;
    }

    // show a file upload form
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
    <h2>With Node.js <code>"http"</code> module</h2>
    <form action="/api/upload" enctype="multipart/form-data" method="post">
      <div>Text field title: <input type="text" name="title" /></div>
      <div>File: <input type="file" name="file"/></div>
      <input type="submit" value="Upload" />
    </form>
  `);
});

server.listen(3000, () => {
    console.log('Server listening on http://localhost:3000 ...');
});
