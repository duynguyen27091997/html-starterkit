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
    cleanCSS = require('gulp-clean-css'),
    uglify = require('gulp-uglify'),
    imagemin = require('gulp-imagemin'),
    cache = require('gulp-cache')


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
        pug: {
            dir: './src/pug',
            files: './src/pug/**/*',
            main: './src/pug/*.pug'
        },
        js: {
            main: './src/js/*.js',
            pages: './src/js/pages',
            files: './src/js/pages/*.js',
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
    },
    dist: {
        base: {
            files: './dist/**/*',
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
const cleanLock = (callback) => {
    del.sync(paths.base.lock.files)
    callback()
}
const cleanDist = (callback) => {
    del.sync(paths.dist.libs.dir)
    callback()
}
const browserSyncInit = (callback) => {
    browserSync.init({
        server: {
            baseDir: [paths.dist.base.dir, paths.src.base.dir, paths.base.base.dir],
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
    watch([paths.src.js.dir], series(compileJs, browserSyncReload))
    watch([paths.src.js.pages], series(compilePageJs, browserSyncReload))
    watch(paths.src.pug.files, series(compilePug, browserSyncReload))
}

const compilePug = () => src(paths.src.pug.main, {
    base: paths.src.pug.dir,
}).pipe(plumber())
    .pipe(pug({
        pretty: true
    }))
    .pipe(dest(paths.dist.base.dir))

const compileScss = () => src(paths.src.scss.main)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(dest(paths.dist.css.dir))
    .pipe(cleanCSS())
    .pipe(
        rename({
            suffix: ".min"
        })
    )
    .pipe(sourcemaps.write("./"))
    .pipe(dest(paths.dist.css.dir));

const compileJs = () => src(paths.src.js.main)
    .pipe(uglify())
    .pipe(dest(paths.dist.js.dir));

const compilePageJs = () => src(paths.src.js.files)
    .pipe(uglify())
    .pipe(dest(paths.dist.js.pages));

const copyLibs = () => src(npmDist(), {
    base: paths.base.node.dir
}).pipe(rename((path) => {
    path.dirname = path.dirname.replace(/\/dist/, '').replace(/\\dist/, '');
})).pipe(dest(paths.dist.libs.dir));

const copyImages = () => src(`${paths.src.images.files}.+(png|jpg|jpeg|gif|svg)`)
    .pipe(cache(imagemin({
        interlaced: true
    })))
    .pipe(dest(paths.dist.images.dir))

const copyFonts = () => src(`${paths.src.fonts.files}`)
    .pipe(dest(paths.dist.fonts.dir))



exports.build = series(
    parallel(cleanLock, cleanDist, copyLibs),
    compileScss,
    compileJs,
    compilePageJs,
    compilePug,
)
exports.default = series(
    parallel(cleanLock, cleanDist, copyLibs,copyImages,copyFonts, compileScss, compileJs, compilePageJs, compilePug),
    parallel(browserSyncInit, serve)
)
