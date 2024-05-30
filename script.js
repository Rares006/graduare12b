AWS.config.region = 'eu-north-1'; // Regiunea ta

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'eu-north-1:a6908557-0992-4a4a-a1d9-3f40bdfc14e9',
});

const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: { Bucket: 'poze12a' },
});

// Definim variabile pentru urmărirea stării camerei și a înregistrării
let cameraDeschisa = false;
let mediaRecorder;
let chunks = [];

// Referințe către elementele HTML
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureButton = document.getElementById('captureButton');
const recordButton = document.getElementById('recordButton');
const stopRecordButton = document.getElementById('stopRecordButton');
const repetatiButton = document.getElementById('repetatiButton');
const sendButton = document.getElementById('sendButton');
const previewImage = document.getElementById('previewImage');
const previewVideo = document.getElementById('previewVideo');
const info = document.getElementById('info');

info.textContent = 'Fă o poză sau înregistrează un video care să rămână amintire a acestei ultime zile din viața de elev';
info.style.fontSize = '24px';
info.style.marginTop = '20px';
info.style.color = '#161616';
info.style.fontFamily = 'Times New Roman';
info.style.fontWeight = 'bold';
info.style.display = 'block';

// Adăugăm evenimentul click pentru capturarea pozei sau începerea înregistrării video
captureButton.addEventListener('click', function() {
    if (!cameraDeschisa) {
        activateCamera();
    } else {
        takePicture();
    }
});

recordButton.addEventListener('click', function() {
    if (!cameraDeschisa) {
        activateCamera();
    } else {
        startRecording();
    }
});

stopRecordButton.addEventListener('click', stopRecording);

// Adăugăm evenimentul click pentru butonul de repetare a capturii pozei sau a înregistrării video
repetatiButton.addEventListener('click', function() {
    // Resetați variabilele
    cameraDeschisa = false;
    mediaRecorder = null;
    chunks = [];

    // Ascundem elementele nedorite
    video.style.display = 'none';
    previewImage.style.display = 'none';
    previewVideo.style.display = 'none';
    sendButton.style.display = 'none';
    repetatiButton.style.display = 'none';
    stopRecordButton.style.display = 'none';
    captureButton.style.display = 'block';
    recordButton.style.display = 'block';
});

// Adăugăm evenimentul click pentru trimiterea pozei sau a înregistrării video
sendButton.addEventListener('click', function() {
    if (previewImage.style.display === 'block') {
        const imageDataURL = canvas.toDataURL('image/png');
        uploadImage(imageDataURL);
    } else if (previewVideo.style.display === 'block') {
        uploadVideo();
    }
});

function activateCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true } }).then(function(stream) {
            video.style.transform = 'rotateY(180deg)';
            video.srcObject = stream;
            video.play();
            video.style.display = 'block';
            cameraDeschisa = true;
            captureButton.textContent = 'Capturează';
            recordButton.textContent = 'Înregistrează';

            // Previne comportamentul full screen
            video.setAttribute('playsinline', 'true'); 
            video.setAttribute('webkit-playsinline', 'true');
        }).catch(function(error) {
            console.error('Eroare la accesarea camerei: ', error);
        });
    } else {
        alert('Browser-ul tău nu suportă accesul la cameră.');
    }
}

function startRecording() {
    chunks = [];
    captureButton.style.display = 'none';
    mediaRecorder = new MediaRecorder(video.srcObject);
    mediaRecorder.ondataavailable = function(event) {
        if (event.data.size > 0) {
            chunks.push(event.data);
        }
    };
    mediaRecorder.onstop = function() {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const videoURL = URL.createObjectURL(blob);
        previewVideo.src = videoURL;
        video.style.display = 'none';
        recordButton.style.display = 'none';
        stopRecordButton.style.display = 'none';
        info.style.display = 'none';
        previewVideo.style.display = 'block';
        sendButton.style.display = 'block';
        repetatiButton.style.display = 'block';

        // Previne comportamentul full screen
        previewVideo.setAttribute('playsinline', 'true'); 
        previewVideo.setAttribute('webkit-playsinline', 'true');
    };
    mediaRecorder.start();
    stopRecordButton.style.display = 'block';
    recordButton.style.display = 'none';

    // Limitează înregistrarea la 15 secunde
    setTimeout(function() {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    }, 6000);
}


function takePicture() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    video.style.display = 'none';
    captureButton.style.display = 'none';
    recordButton.style.display = 'none';
    info.style.display = 'none';
    previewImage.src = canvas.toDataURL('image/png');
    previewImage.style.display = 'block';
    sendButton.style.display = 'block';
    repetatiButton.style.display = 'block';
}

function stopRecording() {
    mediaRecorder.stop();
    stopRecordButton.style.display = 'none';
}

function uploadImage(imageDataURL) {
    const blobData = dataURLtoBlob(imageDataURL);
    uploadToS3(blobData, 'image/png');
}

function uploadVideo() {
    const blobData = new Blob(chunks, { type: 'video/mp4' });
    uploadToS3(blobData, 'video/mp4');
}

function uploadToS3(data, contentType) {
    console.log('Se încarcă fișierul în S3...');

    const params = {
        Key: `media/captured_media_${Date.now()}.${contentType.split('/')[1]}`,
        Body: data,
        ContentType: contentType
    };

    s3.upload(params, function(err, data) {
        if (err) {
            console.error('Eroare la încărcarea fișierului: ', err);
        } else {
            console.log('Fișier încărcat cu succes: ', data.Location);
            // Ascunde elementele după încărcare
            repetatiButton.style.display = 'none';
            sendButton.style.display = 'none';
            previewImage.style.display = 'none';
            previewVideo.style.display = 'none';
            info.textContent = 'Felicitari! Maine vei gasi pe acest cod QR un album cu pozelefacute azi.';
            info.style.color = '#e4c4c7';
            info.style.display = 'block';
        }
    });
}

function dataURLtoBlob(dataURL) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeString });
}
