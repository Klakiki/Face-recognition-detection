const video = document.getElementById("webcamVideo")

// โหลดโมเดลสำหรับตรวจจับใบหน้า
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
]).then(startVideo)

// ฟังก์ชันการสตรีมวิดีโอจาก webcam
function startVideo() {

    // ใช้ getUserMedia เพื่อเข้าถึง webcam
    navigator.getUserMedia(
        {video:{}},  // เข้าถึง webcam
        stream => video.srcObject = stream,  // stream ที่ได้จาก webcam เป็นแหล่งข้อมูลของ <video>
        err => console.error(err)
    )
}

video.addEventListener('play',()=>
{
    // สร้าง canvas สำหรับสร้าง output การตรวจจับใบหน้า
    const canvas = faceapi.createCanvasFromMedia(video)
    document.body.append(canvas)  // ให้ canvas ปรากฏขึ้นบนจอ
    const displaySize = { width: video.width, height: video.height}  // กำหนดขนาด
    faceapi.matchDimensions(canvas, displaySize)  // ปรับให้ output ตรงกับหน้าผู้ใช้

    // ตั้งค่า interval เพื่อให้ตรวจจับใบหน้าทุกๆ 0.1 วิ
    setInterval(async () =>{  // ใส่ async & await เพื่อให้ประมวลผล real time

        // ตรวจจับใบหน้า
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        // ลบการวาดครั้งก่อนๆออก ภาพจะได้ไม่ซ้ำ
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        // วาดการตรวจจับใบหน้า
        faceapi.draw.drawDetections(canvas, resizedDetections)
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
    },100)
})