var gulp = require('gulp'),
    less = require('gulp-less'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify');

gulp.task('less', function () {
    gulp.src('Content/less/*.less')
        .pipe(less())
        .pipe(gulp.dest('Content/css'));
});

gulp.task('bootstrap-styles', function () {
    return gulp.src('wwwroot/lib/bootstrap/dist/css/bootstrap.min.css')
        .pipe(gulp.dest('Content/css'))
});

gulp.task('angular-scripts', function () {
    return gulp.src([
            'wwwroot/lib/angular/angular.min.js',
            'wwwroot/lib/angular-mass-autocomplete/massautocomplete.min.js',
            'wwwroot/lib/angular-sanitize/angular-sanitize.min.js',
            'wwwroot/lib/ngmap/build/scripts/ng-map.min.js'
    ])
        .pipe(concat('angular-bundle.min.js'))
        .pipe(gulp.dest('Scripts/lib'));
});

gulp.task('app-scripts', function () {
    return gulp.src([
            'Scripts/src/transport-app.js',
            'Scripts/src/transport-service.js'
    ])
        .pipe(gulp.dest('scripts'))
});

gulp.task('bootstrap-scripts', function () {
    return gulp.src('wwwroot/lib/bootstrap/dist/js/bootstrap.min.js')
        .pipe(gulp.dest('Scripts/lib'))
});

gulp.task('jquery-scripts', function () {
    return gulp.src('wwwroot/lib/jquery/dist/jquery.min.js')
        .pipe(gulp.dest('Scripts/lib'))
});

gulp.task('watch', function () {
    return gulp.watch(['Scripts/src/*', 'Content/less/*'], ['app-scripts', 'less']);
})

gulp.task('default', ['bootstrap-scripts', 'bootstrap-styles', 'app-scripts', 'angular-scripts', 'jquery-scripts', 'less']);


