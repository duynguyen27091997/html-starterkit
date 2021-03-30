const path = require('path'),
    fs = require('fs');

const {series, src, dest, parallel, watch} = require('gulp'),
    npmDist = require('gulp-npm-dist'),
    rename = require('gulp-rename'),
    del = require('del'),
    plumber = require('gulp-plumber'),
    pug = require('gulp-pug'),
    browserSync = require('browser-sync').create(),
    sourcemaps = require('gulp-sourcemaps'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    imagemin = require('gulp-imagemin'),
    cache = require('gulp-cache'),
    useref = require('gulp-useref'),
    gulpif = require('gulp-if'),
    uglify = require('gulp-uglify'),
    minifyCss = require('gulp-clean-css'),
    replace = require('gulp-replace');


const paths = {
    base: {
        base: {
            dir: './'
        },
        node: {
            dir: './node_modules'
        },
        lock: {
            files: ['./package-lock.json', './yarn.lock']
        }
    },
    src: {
        base: {
            dir: './src'
        },
        scss: {
            dir: './src/scss',
            files: './src/scss/**/*',
            main: './src/scss/*.scss'
        },
        css: {
            dir: './src/css',
            files: './src/css/**/*',
            main: './src/css/*.css'
        },
        pug: {
            dir: './src/views',
            files: './src/views/**/*',
            main: './src/views/*.pug'
        },
        js: {
            main: './src/js/*.js',
            files: './src/js/**/*',
            dir: './src/js'
        },
        images: {
            dir: './src/images',
            files: './src/images/**/*'
        },
        fonts: {
            dir: './src/fonts',
            files: './src/fonts/**/*'
        },
        libs: {
            dir: './src/libs'
        },
    },
    dist: {
        base: {
            files: './dist/**/*',
            assets: './dist/assets',
            dir: './dist'
        },
        libs: {
            dir: './dist/assets/libs'
        },
        css: {
            dir: './dist/assets/css'
        },
        js: {
            dir: './dist/assets/js',
            pages: './dist/assets/js/pages',
        },
        images: {
            dir: './dist/assets/images',
        },
        fonts: {
            dir: './dist/assets/fonts',
        },
    }
}

// function helper
const syncFile = (filePath) => {
    const pwd = path.dirname(__filename);
    const source = path.join(pwd, paths.src.base.dir, filePath)
    const dest = path.join(pwd, paths.dist.base.assets, filePath)
    const destDir = path.dirname(dest)
    fs.stat(destDir, (err) => {
        if (err) fs.mkdirSync(destDir,{ recursive: true })
        fs.copyFileSync(source, dest)
    })
}

const cleanLock = (callback) => {
    del.sync(paths.base.lock.files)
    callback()
}
const cleanDist = (callback) => {
    del.sync(paths.dist.base.dir)
    callback()
}

const cleanSrcBuild = (callback) => {
    del.sync(paths.src.css.dir)
    del.sync(paths.src.libs.dir)
    del.sync(`${paths.src.base.dir}/*.html`)
    callback()
}
const browserSyncInit = (callback) => {
    browserSync.init({
        server: {
            baseDir: [paths.src.base.dir],
        }
    })
    callback()
}
const browserSyncReload = (callback) => {
    browserSync.reload()
    callback()
}
const serve = () => {
    watch(paths.src.scss.files, series(compileScss, browserSyncReload))
    watch(paths.src.js.files, series(browserSyncReload))
    watch(paths.src.pug.files, series(compilePug, browserSyncReload))
}

const compilePug = () => src(paths.src.pug.main, {
    base: paths.src.pug.dir,
}).pipe(plumber())
    .pipe(pug({
        doctype: 'html',
        pretty: true
    }))
    .pipe(dest(paths.src.base.dir))

const compileScss = () => src(paths.src.scss.main)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(
        rename({
            suffix: ".min"
        })
    )
    .pipe(sourcemaps.write("./"))
    .pipe(dest(paths.src.css.dir));

const buildScss = () => src(paths.src.scss.main)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(replace(/url\((?:"|'|)([\w\d_\-\/.]+.(?:png|svg|jpg|jpeg|gif|ttf|eot|eot\?#iefix|woff2|woff))(?:"|'|)\)/gi, function (match, p1) {
        let path = p1.replace(/\.\.\//g, '')
        syncFile(path)
        return `url(../${path})`;
    }))
    .pipe(
        rename({
            suffix: ".min"
        })
    )
    .pipe(sourcemaps.write("./"))
    .pipe(dest(paths.src.css.dir));

// const compileJs = () => src(paths.src.js.main)
//     .pipe(uglify())
//     .pipe(dest(paths.dist.js.dir));
//
// const compilePageJs = () => src(paths.src.js.files)
//     .pipe(uglify())
//     .pipe(dest(paths.dist.js.pages));

const copyLibs = () => src(npmDist(), {
    base: paths.base.node.dir
}).pipe(rename((path) => {
    path.dirname = path.dirname.replace(/\/dist/, '').replace(/\\dist/, '');
})).pipe(dest(paths.src.libs.dir));

const copyImages = () => src(`${paths.src.images.files}.+(png|jpg|jpeg|gif|svg)`)
    .pipe(cache(imagemin({
        interlaced: true
    })))
    .pipe(dest(paths.dist.images.dir))

const copyFonts = () => src(`${paths.src.fonts.files}`)
    .pipe(dest(paths.dist.fonts.dir))


const useRef = () => src(`${paths.src.base.dir}/*.html`)
    .pipe(useref())
    //resolve images path
    .pipe(replace(/src=(?:"|'|)([\w\d_\-\/.]+.(?:png|svg|jpg|jpeg|gif))(?:"|'|)/gi, function (match, path) {
        syncFile(path)
        return `src="assets/${path}"`;
    }))
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.css', minifyCss()))
    .pipe(dest(paths.dist.base.dir));

exports.build = series(
    parallel(cleanLock, cleanDist,cleanSrcBuild, copyLibs),
    parallel(buildScss,/* copyImages, copyFonts*/),
    series(compilePug, useRef),
)
exports.default = series(
    parallel(cleanLock, cleanSrcBuild, copyLibs, compileScss),
    compilePug,
    parallel(browserSyncInit, serve)
)
exports.clean = parallel(cleanDist,cleanSrcBuild);
