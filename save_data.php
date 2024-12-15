<?php
header('Content-Type: application/json');

try {
    // استلام البيانات من الطلب
    $data = file_get_contents('php://input');
    
    // التحقق من صحة البيانات
    $jsonData = json_decode($data);
    if ($jsonData === null) {
        throw new Exception('Invalid JSON data');
    }
    
    // حفظ البيانات في الملف
    if (file_put_contents('data.json', $data) === false) {
        throw new Exception('Failed to save data');
    }
    
    // إرجاع رد نجاح
    echo json_encode(['success' => true]);
    
} catch (Exception $e) {
    // إرجاع رسالة الخطأ
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
