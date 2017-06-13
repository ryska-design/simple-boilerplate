/**
 * Gulp Packages
 */

// General
var gulp = require('gulp');
var fs = require('fs');
var del = require('del');
var lazypipe = require('lazypipe');
var plumber = require('gulp-plumber');
var flatten = require('gulp-flatten');
var tap = require('gulp-tap');
var rename = require('gulp-rename');
var header = require('gulp-header');
var footer = require('gulp-footer');
var watch = require('gulp-watch');
var livereload = require('gulp-livereload');
var package = require('./package.json');

// Scripts and tests
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var optimizejs = require('gulp-optimize-js');

// Sass 
var sass = require('gulp-sass');
var postcss      = require('gulp-postcss');
var sourcemaps   = require('gulp-sourcemaps');
var autoprefixer = require('autoprefixer');

// public
var markdown = require('gulp-markdown');
var fileinclude = require('gulp-file-include');


/**
 * Paths to project folders
 */

var paths = {
    input: 'src/**/*',
    output: 'dist/',
    scripts: {
        input: 'src/js/*',
        output: 'dist/js/'
    },
    styles: {
        input: 'src/sass/**/*.{scss,sass}',
        output: 'dist/css/'
    },
    svgs: {
        input: 'src/svg/*',
        output: 'dist/svg/'
    },
    images: {
        input: 'src/img/*',
        output: 'dist/img/'
    },
    static: {
        input: 'src/static/*',
        output: 'dist/'
    },    
    public: {
        input: 'src/public/*.{html,md,markdown}',
        output: 'public/',
        templates: 'src/public/_templates/',
        assets: 'src/public/assets/**'
    }
};


/**
 * Template for banner to add to file headers
 */

var banner = {
    full :
        '/*!\n' +
        ' * <%= package.name %> v<%= package.version %>: <%= package.description %>\n' +
        ' * (c) ' + new Date().getFullYear() + ' <%= package.author.name %>\n' +
        ' * <%= package.license %> License\n' +
        ' * <%= package.repository.url %>\n' +
        ' */\n\n',
    min :
        '/*!' +
        ' <%= package.name %> v<%= package.version %>' +
        ' | (c) ' + new Date().getFullYear() + ' <%= package.author.name %>' +
        ' | <%= package.license %> License' +
        ' | <%= package.repository.url %>' +
        ' */\n'
};


/**
 * Gulp Taks
 */

// Lint, minify, and concatenate scripts
gulp.task('build:scripts', ['clean:dist'], function() {
    var jsTasks = lazypipe()
        .pipe(header, banner.full, { package : package })
        .pipe(optimizejs)
        .pipe(gulp.dest, paths.scripts.output)
        .pipe(rename, { suffix: '.min' })
        .pipe(uglify)
        .pipe(optimizejs)
        .pipe(header, banner.min, { package : package })
        .pipe(gulp.dest, paths.scripts.output);

    return gulp.src(paths.scripts.input)
        .pipe(plumber())
        .pipe(tap(function (file, t) {
            if ( file.isDirectory() ) {
                var name = file.relative + '.js';
                return gulp.src(file.path + '/*.js')
                    .pipe(concat(name))
                    .pipe(jsTasks());
            }
        }))
        .pipe(jsTasks());
});

// Lint scripts
gulp.task('lint:scripts', function () {
    return gulp.src(paths.scripts.input)
        .pipe(plumber())
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

// Compile sass & add autoprefixes and sourcemap
gulp.task('build:styles', function () {
  return gulp.src(paths.styles.input)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([ autoprefixer() ]))
    .pipe(sourcemaps.write('.'))    
    .pipe(gulp.dest(paths.styles.output));
});

// Copy images
gulp.task('copy:images', function() {
    return gulp.src(paths.images.input)
        .pipe(plumber())
        .pipe(gulp.dest(paths.images.output));
});

// Copy svgs
gulp.task('copy:svgs', function() {
    return gulp.src(paths.svgs.input)
        .pipe(plumber())
        .pipe(gulp.dest(paths.svgs.output));
});

// Copy static
gulp.task('copy:static', function() {
    return gulp.src(paths.static.input)
        .pipe(plumber())
        .pipe(gulp.dest(paths.static.output));
});

// Remove pre-existing content from output folders
gulp.task('clean:dist', function () {
    del.sync([
        paths.output
    ]);
});

// Generate documentation
gulp.task('build:public', ['compile', 'clean:public'], function() {
    return gulp.src(paths.public.input)
        .pipe(plumber())
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(tap(function (file, t) {
            if ( /\.md|\.markdown/.test(file.path) ) {
                return t.through(markdown);
            }
        }))
        .pipe(header(fs.readFileSync(paths.public.templates + '/_header.html', 'utf8')))
        .pipe(footer(fs.readFileSync(paths.public.templates + '/_footer.html', 'utf8')))
        .pipe(gulp.dest(paths.public.output));
});

// Copy distribution files to public
gulp.task('copy:dist', ['compile', 'clean:public'], function() {
    return gulp.src(paths.output + '/**')
        .pipe(plumber())
        .pipe(gulp.dest(paths.public.output + '/dist'));
});

// Copy documentation assets to public
gulp.task('copy:assets', ['clean:public'], function() {
    return gulp.src(paths.public.assets)
        .pipe(plumber())
        .pipe(gulp.dest(paths.public.output + '/assets'));
});

// Remove prexisting content from public folder
gulp.task('clean:public', function () {
    return del.sync(paths.public.output);
});

// Spin up livereload server and listen for file changes
gulp.task('listen', function () {
    livereload.listen();
    gulp.watch(paths.input).on('change', function(file) {
        gulp.start('default');
        gulp.start('refresh');
    });
});

// Run livereload after file change
gulp.task('refresh', ['compile', 'public'], function () {
    livereload.changed();
});


/**
 * Task Runners
 */

// Compile files
gulp.task('compile', [
    'lint:scripts',
    'clean:dist',
    'build:scripts',
    'build:styles',
    'copy:images',
    'copy:svgs',
    'copy:static'
]);

// Generate documentation
gulp.task('public', [
    'clean:public',
    'build:public',
    'copy:dist',
    'copy:assets'
]);

// Compile files and generate public (default)
gulp.task('default', [
    'compile',
    'public'
]);

// Compile files and generate public when something changes
gulp.task('watch', [
    'listen',
    'default'
]);