importScripts('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');

self.onmessage = async (e) => {
  const { type, images, settings } = e.data;

  if (type === 'GENERATE') {
    try {
      const { jsPDF } = self.jspdf;
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: settings.format, // 'a4' or 'letter'
        compress: true
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = settings.margin;
      const workW = pageWidth - (margin * 2);
      const workH = pageHeight - (margin * 2);

      for (let i = 0; i < images.length; i++) {
        if (i > 0) doc.addPage();
        
        // Notify Progress
        self.postMessage({ type: 'PROGRESS', percent: Math.round(((i + 1) / images.length) * 100) });

        // Create Bitmap from Blob
        const bmp = await createImageBitmap(images[i]);

        // Calculate Scale (Fit to Page)
        const scale = Math.min(workW / bmp.width, workH / bmp.height);
        const w = bmp.width * scale;
        const h = bmp.height * scale;
        
        // Center Image
        const x = margin + (workW - w) / 2;
        const y = margin + (workH - h) / 2;

        // Compression using OffscreenCanvas
        const canvas = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bmp, 0, 0);
        
        const compressedBlob = await canvas.convertToBlob({ 
          type: 'image/jpeg', 
          quality: settings.quality 
        });
        
        // Convert Blob to ArrayBuffer for jsPDF
        const buffer = new Uint8Array(await compressedBlob.arrayBuffer());

        doc.addImage(buffer, 'JPEG', x, y, w, h);
        
        // Clean up memory
        bmp.close();
      }

      // Add Page Numbers
      if (settings.pageNums) {
        const totalPages = doc.getNumberOfPages();
        doc.setFontSize(10);
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        }
      }

      // Done
      self.postMessage({ 
        type: 'DONE', 
        data: { blob: doc.output('blob'), filename: settings.filename } 
      });

    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message });
    }
  }
};