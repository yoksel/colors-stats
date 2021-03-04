const fs = require('fs');
const path = require('path');

//------------------------------

const checkOrCreateDir = (folderName) => {
    try {
        if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName)
        }
    } catch (err) {
        console.error(err)
    }
}

//------------------------------

const checkIsNew = (mtimeMs, notOlderThan) => {
    if (!notOlderThan || !notOlderThan.year) {
        return true;
    }

    const dateParts = [
        notOlderThan.year
    ];
    if (notOlderThan.month) {
        dateParts.push(notOlderThan.month - 1);

        if (notOlderThan.day) {
            dateParts.push(notOlderThan.day);
        }
    }

    const fileDateMS = parseInt(mtimeMs);
    const dateOfOldFilesMS = new Date(...dateParts).getTime();

    return dateOfOldFilesMS <= fileDateMS;
};

//------------------------------

const getFileContent = fullPath => new Promise((resolve, reject) => {
    fs.readFile(fullPath, 'utf-8', (err, data) => {
        if (err) {
            reject(err);
        }

        resolve(data);
    })
});

//------------------------------

const getDirFiles = dirPath => new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, data) => {
        if (err) {
            reject(err);
            return;
        }

        resolve(data);
    })
})

//------------------------------

const getReadDirPromise = ({
    dirPath, filesToParse, fileHandler, ignoreFiles,
    ignoreDirs, notOlderThan,
    pushToDirectories
}) => new Promise(async (resolveReadDir, rejectReadDir) => {
    let filtered = [];

    if (filesToParse) {
        filtered = filesToParse;
        // Ignore dates for handpicked files
        notOlderThan = {};
    }
    else {
        const data = await getDirFiles(dirPath);
        filtered = data.filter(item => !item.startsWith('.'));
    }

    if (filtered.length === 0) {
        resolveReadDir();
    }

    await getHandleFilteredPromises({
        filtered,
        dirPath,
        fileHandler,
        ignoreFiles,
        ignoreDirs,
        notOlderThan,
        pushToDirectories
    });

    resolveReadDir();
})

//------------------------------

const getStat = fullPath => new Promise((resolve, reject) => {
    fs.lstat(fullPath, (err, status) => {
        if (err) {
            reject(err);
        }

        resolve(status);
    });
});

//------------------------------

const getHandleFilteredPromises = ({
    filtered, dirPath, fileHandler,
    ignoreFiles, ignoreDirs, notOlderThan,
    pushToDirectories
}) => {
    const promises = filtered.map((item, index) => new Promise(async (resolve, reject) => {
        let fullPath = item;

        if (dirPath && !item.includes(dirPath)) {
            fullPath = `${dirPath}/${item}`;
        }

        const stats = await getStat(fullPath);

        // Handle file stats
        if (stats.isDirectory()) {
            const isIgnoredDir = ignoreDirs
                .some(item => fullPath.indexOf(item) > -1);

            if (!isIgnoredDir) {
                pushToDirectories(fullPath);
                resolve('Added new directory');
            }
            else {
                resolve('Skip directory');
            }
        }
        else if (stats.isFile()) {
            const isIgnoredFile = ignoreFiles
                .some(item => fullPath.indexOf(item) > -1);

            if (!isIgnoredFile) {
                // Ignore old files if notOlderThan is set
                const isNew = checkIsNew(stats.mtimeMs, notOlderThan);

                if (isNew) {
                    const result = await fileHandler({fullPath});
                    resolve(result);
                }
                else {
                    resolve('Old file, ignore');
                }
            }
        }

        if (index === filtered.length - 1) {
            resolve(index);
        }
    }));

    return Promise.all(promises);
}

//------------------------------

module.exports = {
    checkOrCreateDir,
    getStat,
    checkIsNew,
    getFileContent,
    getReadDirPromise,
    getHandleFilteredPromises
};
