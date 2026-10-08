pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const bookContainer = document.getElementById('flip-book');
const mainZoomContainer = document.querySelector('.book-container');
const loading = document.getElementById('loading');

let pageFlip = null;
let pdfDocument = null; // Guardamos el PDF en memoria para extraer el texto
let zoomLevel = 1;

// Configurar el sonido (Asegúrate de tener este archivo en tu repo)
const flipSound = new Audio('sonido-pagina.mp3');

// 1. CARGA AUTOMÁTICA DEL PDF AL INICIAR
window.addEventListener('DOMContentLoaded', async () => {
    loading.style.display = 'block';
    try {
        const response = await fetch('cuento.pdf');
        if (!response.ok) throw new Error("No se pudo cargar el archivo PDF.");
        
        const arrayBuffer = await response.arrayBuffer();
        const typedarray = new Uint8Array(arrayBuffer);
        loadPDF(typedarray);
    } catch (error) {
        console.error('Error:', error);
        loading.innerText = 'Error al cargar el cuento. Verifica que "cuento.pdf" exista.';
    }
});

async function loadPDF(pdfData) {
    try {
        pdfDocument = await pdfjsLib.getDocument(pdfData).promise;
        const totalPages = pdfDocument.numPages;
        
        const firstPage = await pdfDocument.getPage(1);
        const viewportInfo = firstPage.getViewport({ scale: 1.5 });
        const pageWidth = viewportInfo.width;
        const pageHeight = viewportInfo.height;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.appendChild(canvas);
            bookContainer.appendChild(pageDiv);
        }

        bookContainer.style.display = 'block';
        
        // Efectos especiales en la configuración
        pageFlip = new St.PageFlip(bookContainer, {
            width: pageWidth,
            height: pageHeight,
            size: "stretch", 
            minWidth: 315,
            maxWidth: pageWidth,
            minHeight: 420,
            maxHeight: pageHeight,
            showCover: true,
            maxShadowOpacity: 0.6, // Sombras un poco más marcadas
            usePortrait: true, 
            flippingTime: 1200 // TRANSICIÓN MÁS LENTA Y SUAVE
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page'));
        
        // Disparar sonido al pasar de página
        pageFlip.on('flip', () => {
            flipSound.currentTime = 0; // Reiniciar el audio si se pasa rápido
            flipSound.play().catch(e => console.log("Audio bloqueado por el navegador hasta que el usuario interactúe."));
        });
        
        loading.style.display = 'none';
        
    } catch (error) {
        console.error('Error al renderizar el PDF:', error);
        loading.innerText = 'Error al procesar el PDF.';
    }
}

// 2. NAVEGACIÓN
document.getElementById('btn-prev').addEventListener('click', () => {
    if (pageFlip) pageFlip.flipPrev();
});

document.getElementById('btn-next').addEventListener('click', () => {
    if (pageFlip) pageFlip.flipNext();
});

// 3. ZOOM (Accesibilidad Visual)
document.getElementById('btn-zoom-in').addEventListener('click', () => {
    zoomLevel += 0.2;
    mainZoomContainer.style.transform = `scale(${zoomLevel})`;
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if (zoomLevel > 0.5) { // Límite para no achicar demasiado
        zoomLevel -= 0.2;
        mainZoomContainer.style.transform = `scale(${zoomLevel})`;
    }
});

// 4. LECTURA EN VOZ ALTA (TTS)
document.getElementById('btn-read').addEventListener('click', async () => {
    if (!pdfDocument || !pageFlip) return;
    
    // Si ya está leyendo, detenemos el audio para no superponer
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        return;
    }

    // Identificar qué página se está viendo (la librería empieza en 0, pdfjs en 1)
    let currentPageIndex = pageFlip.getCurrentPageIndex();
    let pdfPageNum = currentPageIndex + 1;
    
    try {
        const page = await pdfDocument.getPage(pdfPageNum);
        const textContent = await page.getTextContent();
        
        // Extraer y unir los fragmentos de texto
        const textStrings = textContent.items.map(item => item.str);
        const textToRead = textStrings.join(' ');
        
        if (textToRead.trim() === '') {
            alert("No hay texto legible en esta página.");
            return;
        }

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'es-ES'; // Idioma español
        utterance.rate = 0.85; // Velocidad reducida ideal para niños
        utterance.pitch = 1.1; // Tono ligeramente más agudo
        
        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error("Error al extraer texto:", error);
    }
});