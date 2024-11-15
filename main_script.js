const video = document.getElementById("webcamVideo")

// โหลดโมเดลทั้งหมดที่จำเป็นสำหรับการตรวจจับใบหน้า จุดสำคัญ จดจำใบหน้า บอกอารมณ์
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),     
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),       
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),      
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),       
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models')          
]).then(startVideo)

// ฟังก์ชันการสตรีมวิดีโอจาก webcam
function startVideo() {
    navigator.getUserMedia(
        { video: {} }, // เข้าถึง webcam
        stream => video.srcObject = stream, // กำหนด stream จาก webcam ให้เป็นแหล่งข้อมูลของ <video>
        err => console.error(err)
    )
}

video.addEventListener('play', async () => {
    // สร้าง canvas สำหรับการวาดผลลัพธ์การตรวจจับใบหน้า
    const canvas = faceapi.createCanvasFromMedia(video)
    document.body.append(canvas)

    // กำหนดขนาดของ canvas
    const displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize) // ปรับขนาด canvas ให้ตรงกับ displaySize

    // โหลดข้อมูลใบหน้าที่เคยบันทึกไว้จากโฟลเดอร์ labeled_images
    const labeledFaceDescriptors = await loadLabeledImages()
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6) // กำหนด threshold สำหรับการจดจำใบหน้า

    // ตั้งค่า interval ให้ตรวจจับใบหน้าและอารมณ์ทุกๆ 0.1วิ
    setInterval(async () => {
        // ตรวจจับใบหน้า จุดสำคัญ และอารมณ์
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors()
            .withFaceExpressions()

        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)// ลบการวาดครั้งก่อนออกจาก canvas
        // ตรวจสอบใบหน้าที่ตรวจจับได้กับฐานข้อมูลที่เคยบันทึก
        const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))

        // วาดกรอบใบหน้า แสดงชื่อและอารมณ์
        results.forEach((result, i) => {
            const box = resizedDetections[i].detection.box // ตำแหน่งกรอบใบหน้า
            const expressions = resizedDetections[i].expressions // อารมณ์ที่ตรวจจับได้
            // อารมณ์ที่มีค่าความมั่นใจสูงสุด
            const maxExpression = Object.keys(expressions).reduce((a,b)=>expressions[a]>expressions[b]?a:b) 

            // สร้างข้อความที่จะแสดง (ชื่อ + อารมณ์)
            const label = `${result.toString()} - ${maxExpression}`

            // วาดกรอบใบหน้าและชื่อ + อารมณ์บน canvas
            const drawBox = new faceapi.draw.DrawBox(box, { label })
            drawBox.draw(canvas)
        })

        // วาดจุดสำคัญบนใบหน้า
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    }, 100)
})

// ฟังก์ชันสำหรับโหลดข้อมูลใบหน้า
async function loadLabeledImages() {
    const labels = ['Jennie', 'Jisoo', 'Karina', 'PorTanawut'] // รายชื่อของบุคคลที่ต้องการจดจำ
    return Promise.all(
        labels.map(async label => {
            const descriptions = []

            // โหลดภาพของแต่ละบุคคล (5 ภาพต่อคน)
            for (let i = 1; i <= 5; i++) {
                const img = await faceapi.fetchImage(`/labeled_images/${label}/${i}.jpg`)
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                
                if (detections) {
                    descriptions.push(detections.descriptor) // เก็บข้อมูล descriptor ของใบหน้า
                }
            }

            // สร้าง Face Descriptor ของแต่ละบุคคล
            return new faceapi.LabeledFaceDescriptors(label, descriptions)
        })
    )
}
