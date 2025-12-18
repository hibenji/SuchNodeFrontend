<?php
header('Content-Type: application/json');

$type = $_GET['type'] ?? '';
$url = '';

if ($type === 'data') {
    $url = 'https://suchnode.net/?data';
} elseif ($type === 'stats') {
    $url = 'https://suchnode.net/?stats';
} else {
    echo json_encode(['error' => 'Invalid type']);
    exit;
}

$response = file_get_contents($url);
if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch data']);
} else {
    echo $response;
}
