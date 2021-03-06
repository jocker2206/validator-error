const ValidatorError = require('./ValidatorError');
const fs = require('fs');


const saveOneFile = async (file, config = {}, Helpers, upload) => {
    // name 
    upload.options.name = upload.options.name ? `${upload.options.name}.${file.extname}` : file.clientName;
    // mover
    await file.move(Helpers.tmpPath(upload.path), upload.options);
    if (!file.moved()) {
        let error = file.error();
        throw new ValidatorError([
            {
                field: error.fieldName,
                message: error.message
            }
        ]);
    }
    // response
    return {
        success: true,
        code: "SAVE_SUCCESS",
        message: "El archivo se guardo correctamente",
        realPath: Helpers.tmpPath(`${upload.path}/${upload.options.name}`),
        path: `${upload.path}/${upload.options.name}`,
        name: upload.options.name,
        extname: file.extname,
        size: file.size,
        base64: config.base64 ? fs.readFileSync(Helpers.tmpPath(`${upload.path}/${upload.options.name}`), 'base64') : null
    }
}

const saveFile = async (request, name, config = { required: false, base64: false, multifiles: false }, Helpers, upload = { path: "upload", options: { name: "", overwrite: false } }) => {
    let file = request.file(name, config);
    if (config.required && !file) throw new ValidatorError([ { field: name, message: `el archivo ${name} es requerido` } ]);
    if (!file) return {
        success: false,
        code: "NOT_FOUND_FILE",
        message: "No se encontró el archivo"
    };
    // validar multiples archivos
    if (config.multifiles) {
        let tmpFiles = [];
        // validar multiples archivos
        if (file.moveAll) {
            // save files
            await file.moveAll(Helpers.tmpPath(upload.path), (f) => {
                let newName = upload.options.name ? `${upload.options.name}_${new Date().getTime()}.${f.extname}` : f.clientName;
                // add file 
                tmpFiles.push({
                    realPath: Helpers.tmpPath(`${upload.path}/${newName}`),
                    path: `${upload.path}/${newName}`,
                    name: newName,
                    extname: f.extname,
                    size: f.size,
                    base64: config.base64 ? fs.readFileSync(Helpers.tmpPath(`${upload.path}/${newName}`), 'base64') : null
                });
                // save name
                return { name: newName, overwrite: upload.options.overwrite || false };
            });
            // validar archivos
            if (!file.movedAll()) {
                let errors = file.errors();
                throw new ValidatorError(errors);
            }
        } else {
            let oneFile = await saveOneFile(file, config, Helpers, upload);
            tmpFiles.push(oneFile);
        }
        // response multifiles
        return {
            success: true,
            code: 'SAVE_SUCCESS_FILES',
            message: "Los archivos se guardarón correctamente",
            files: tmpFiles
        }
    }
    // next
    return await saveOneFile(file, config, Helpers, upload);
}


module.exports = { saveFile };