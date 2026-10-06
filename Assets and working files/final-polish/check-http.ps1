$paths = @('/','/manga/page-001.webp','/manga/page-022.webp','/scene/layers/rabbit-polished.webp','/scene/layers/panda-run-polished.webp','/scene/layers/water-flow.webp')
foreach ($path in $paths) {
 $response = Invoke-WebRequest -Uri ('http://127.0.0.1:5173' + $path) -UseBasicParsing
 [PSCustomObject]@{Path=$path;Status=$response.StatusCode;Type=$response.Headers.'Content-Type';Bytes=$response.RawContentLength}
}
