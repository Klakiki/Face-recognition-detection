// เข้าถึง element <video> ที่มี id เป็น 'webcamVideo' 
const video = document.getElementById("webcamVideo")

// โหลดโมเดลที่จำเป็นสำหรับการตรวจจับใบหน้าและจดจำใบหน้า
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'), // โหลดโมเดลตรวจจับใบหน้าขนาดเล็ก
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'), // โหลดโมเดลสำหรับตรวจจับจุดสำคัญบนใบหน้า (เช่น ตา ปาก จมูก)
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'), // โหลดโมเดลสำหรับจดจำใบหน้า
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
]).then(startVideo) // เมื่อโหลดเสร็จแล้ว เริ่มสตรีมวิดีโอจาก webcam

// ฟังก์ชันเริ่มต้นการสตรีมวิดีโอจาก webcam
function startVideo() {
    navigator.getUserMedia(
        { video: {} }, // ขออนุญาตเข้าถึง webcam (เฉพาะวิดีโอ)
        stream => video.srcObject = stream, // กำหนด stream จาก webcam ให้เป็นแหล่งข้อมูลของ <video>
        err => console.error(err) // แสดง error ในกรณีที่เข้าถึง webcam ไม่ได้
    )
}

// เมื่อวิดีโอเริ่มเล่น (event 'play')
video.addEventListener('play', async () => {
    // สร้าง canvas สำหรับการวาดผลลัพธ์การตรวจจับใบหน้า
    const canvas = faceapi.createCanvasFromMedia(video)
    document.body.append(canvas) // เพิ่ม canvas ลงไปในหน้าเว็บ

    // กำหนดขนาดของ canvas ให้ตรงกับขนาดของวิดีโอ
    const displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize) // ปรับขนาด canvas ให้ตรงกับ displaySize

    // โหลดข้อมูลใบหน้าที่เคยบันทึกไว้จากไฟล์ JSON
    const labeledFaceDescriptors = await loadLabeledImages()
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6) // กำหนด threshold สำหรับการจดจำใบหน้า (0.6)

    // ตั้งค่า interval ให้ตรวจจับใบหน้าทุก ๆ 100ms
    setInterval(async () => {
        // ตรวจจับใบหน้าและจุดสำคัญบนใบหน้า
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors()
        const resizedDetections = faceapi.resizeResults(detections, displaySize) // ปรับขนาดผลลัพธ์ให้ตรงกับขนาดของวิดีโอ

        // ลบการวาดครั้งก่อนออกจาก canvas
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

        // เปรียบเทียบใบหน้าที่ตรวจจับได้กับใบหน้าที่บันทึกไว้
        const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))

        // วาดกรอบและชื่อของบุคคลที่ตรวจจับได้
        results.forEach((result, i) => {
            const box = resizedDetections[i].detection.box
            const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() })
            drawBox.draw(canvas)
        })
    }, 100) // ตรวจจับซ้ำทุก 100 มิลลิวินาที
})

// ฟังก์ชันสำหรับโหลดข้อมูลใบหน้าที่เคยบันทึกไว้
function loadLabeledImages() {
    const labels = ['Jennie', 'Jisoo', 'Lisa', 'Rose'] // รายชื่อของบุคคลที่ต้องการจดจำ (ใส่ชื่อที่ต้องการ)
    return Promise.all(
        labels.map(async label => {
            const descriptions = []
            
            // โหลดภาพของแต่ละบุคคล (5 ภาพต่อคน)
            for (let i = 1; i <= 4; i++) {
                const img = await faceapi.fetchImage(`labeled_images/${label}/${i}.jpg`)
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                
                
                descriptions.push(detections.descriptor) // เก็บข้อมูล descriptor ของใบหน้า
                
            }
            
            // สร้าง Face Descriptor ของแต่ละบุคคล
            return new faceapi.LabeledFaceDescriptors(label, descriptions)
        })
    )
}
