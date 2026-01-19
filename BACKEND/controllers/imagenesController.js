// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ===== FUNCIONAMIENTO/FUNCIONES =====
// Crear directorio de uploads si no existe - RUTA ABSOLUTA
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de almacenamiento de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Usar ruta absoluta
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + path.extname(file.originalname);
        cb(null, filename);
    }
});

// Función para validar tipo de archivo
function checkFileType(file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error("Solo se permiten imágenes (jpeg, jpg, png, webp)"));
    }
}

// Configuración de multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB límite
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
}).any(); // Importante: .any() permite múltiples archivos con cualquier nombre de campo

// ===== CONTROLADORES =====
// Obtener todas las imágenes
const getImages = (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            console.error("❌ Error al leer directorio de uploads:", err);
            return res.status(500).json({ 
                success: false,
                error: "Error al obtener las imágenes" 
            });
        }

        // Filtrar solo archivos de imagen
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        });

        res.json({ 
            success: true,
            images: imageFiles 
        });
    });
};

// Subir imágenes
const uploadImages = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error("❌ Error de multer:", err);
            return res.status(400).json({ 
                success: false,
                error: err.message 
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: "Por favor selecciona una imagen para subir" 
            });
        }
        
        // Devolver información de los archivos subidos
        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            path: `/uploads/${file.filename}`,
            size: file.size
        }));

        res.status(200).json({ 
            success: true,
            message: "Imagen(es) subida(s) correctamente",
            files: uploadedFiles
        });
    });
};

// Eliminar imágenes
const deleteImages = (req, res) => {
    const { images } = req.body;

    if (!images || images.length === 0) {
        return res.status(400).json({ 
            success: false,
            error: "No se especificaron imágenes para eliminar" 
        });
    }

    let deletedCount = 0;
    const errors = [];

    images.forEach(image => {
        const filePath = path.join(uploadsDir, image);
        
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                deletedCount++;
            } else {
                errors.push(`Archivo no encontrado: ${image}`);
            }
        } catch (error) {
            console.error(`❌ Error al eliminar ${image}:`, error);
            errors.push(`Error al eliminar: ${image}`);
        }
    });

    res.json({ 
        success: true,
        message: `Se eliminaron ${deletedCount} imagen(es)`,
        deletedCount,
        errors: errors.length > 0 ? errors : undefined
    });
};

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = {
    getImages,
    uploadImages,
    deleteImages
};