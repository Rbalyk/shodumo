'use strict';

require('dotenv').config();

const { src, dest, series, parallel, watch } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const cleanCss = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const terser = require('gulp-terser');
const concat = require('gulp-concat');
const fileInclude = require('gulp-file-include');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const plumber = require('gulp-plumber');
const replace = require('gulp-replace');
const browserSync = require('browser-sync').create();
const del = require('del');
const fs = require('fs');

const env = {
  // API_URL is the single source of the client API base URL for build,
  // prerender and the runtime bundle. localhost is only a local-dev default —
  // in a prod build API_URL must be set and fully replaces it.
    API_BASE_URL: process.env.API_URL,
    SITE_URL: process.env.SITE_URL,
    APP_URL: process.env.APP_URL,
    DEFAULT_CITY: process.env.DEFAULT_CITY,
    DEV_PORT: Number(process.env.DEV_PORT),

    // API_BASE_URL: 'http://localhost:3000',
    // SITE_URL: 'http://localhost:3001',
    // APP_URL: 'http://localhost:4200',
    // DEFAULT_CITY: 'lviv',
    // DEV_PORT: Number(3001),
};

// --- i18n: two static language branches (uk → root, en → /en/) ---
function loadDict(lang) {
  return JSON.parse(fs.readFileSync(`src/i18n/${lang}.json`, 'utf8'));
}
// English slug→name map for cities/categories — the client falls back to this
// when the API hasn't been reached yet (no flash of Ukrainian on the en branch)
function loadTaxonomy(lang) {
  if (lang !== 'en') return null;
  const tx = JSON.parse(fs.readFileSync('src/i18n/taxonomy.en.json', 'utf8'));
  return { cities: tx.cities || {}, categories: tx.categories || {} };
}
const LANGS = [
  { code: 'uk', base: '', out: 'dist' },
  { code: 'en', base: '/en', out: 'dist/en' },
];
// match @@t.dotted.key tokens (no trailing dot captured)
const T_TOKEN = /@@t\.([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)/g;

const paths = {
  dist: 'dist',
  html: {
    pages: 'src/pages/*.html',
    partials: 'src/pages/partials/**/*.html',
    watch: 'src/pages/**/*.html',
  },
  scss: { entry: 'src/scss/main.scss', watch: 'src/scss/**/*.scss' },
  // explicit bundle order — modules attach to the global `window.SD` namespace
  js: {
    bundle: [
      'src/js/config.js',
      'src/js/i18n.js',
      'src/js/icons.js',
      'src/js/api.js',
      'src/js/toast.js',
      'src/js/auth.js',
      'src/js/city.js',
      'src/js/map.js',
      'src/js/home.js',
      'src/js/event.js',
      'src/js/organizer.js',
      'src/js/account.js',
      'src/js/main.js',
    ],
    watch: 'src/js/**/*.js',
  },
  images: 'src/images/**/*',
  assets: 'src/assets/**/*',
};

function clean() {
  return del([paths.dist]);
}

// build one language branch of the static HTML
function htmlFor(langCfg) {
  const dict = loadDict(langCfg.code);
  const taxonomy = loadTaxonomy(langCfg.code);
  const i18nScript =
    '<script>window.SD=window.SD||{};' +
    `window.SD.lang='${langCfg.code}';` +
    `window.SD.langBase='${langCfg.base}';` +
    (taxonomy ? `window.SD.taxonomy=${JSON.stringify(taxonomy)};` : '') +
    `window.SD.i18nDict=${JSON.stringify(dict)};</script>`;

  function task() {
    return src(paths.html.pages)
      .pipe(plumber())
      .pipe(
        fileInclude({
          prefix: '@@',
          basepath: 'src/pages/partials',
          context: {
            siteUrl: env.SITE_URL,
            defaultCity: env.DEFAULT_CITY,
            robots: 'index, follow',
            langBase: langCfg.base,
            htmlLang: langCfg.code,
            ogLocale: dict['og.locale'] || 'uk_UA',
          },
        }),
      )
      // resolve @@t.* translation tokens from the active dictionary
      .pipe(replace(T_TOKEN, (m, key) => (Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : m)))
      // inline the dictionary + lang for the client bundle
      .pipe(replace('<!--I18N_DATA-->', i18nScript))
      .pipe(replace('__API_BASE_URL__', env.API_BASE_URL))
      .pipe(replace('__SITE_URL__', env.SITE_URL))
      .pipe(replace('__APP_URL__', env.APP_URL))
      .pipe(replace('__DEFAULT_CITY__', env.DEFAULT_CITY))
      .pipe(
        htmlmin({
          collapseWhitespace: true,
          removeComments: true,
          minifyCSS: true,
          minifyJS: true,
        }),
      )
      .pipe(dest(langCfg.out))
      .pipe(browserSync.stream());
  }
  task.displayName = `html:${langCfg.code}`;
  return task;
}

const html = parallel(...LANGS.map(htmlFor));

function styles() {
  return src(paths.scss.entry)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({ cascade: false }))
    .pipe(cleanCss({ level: 2 }))
    .pipe(sourcemaps.write('.'))
    .pipe(dest(`${paths.dist}/css`))
    .pipe(browserSync.stream());
}

function scripts() {
  return src(paths.js.bundle, { allowEmpty: true })
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(concat('bundle.js'))
    .pipe(replace('__API_BASE_URL__', env.API_BASE_URL))
    .pipe(replace('__SITE_URL__', env.SITE_URL))
    .pipe(replace('__APP_URL__', env.APP_URL))
    .pipe(replace('__DEFAULT_CITY__', env.DEFAULT_CITY))
    .pipe(terser())
    .pipe(sourcemaps.write('.'))
    .pipe(dest(`${paths.dist}/js`))
    .pipe(browserSync.stream());
}

function images() {
  return src(paths.images, { allowEmpty: true, encoding: false })
    .pipe(plumber())
    .pipe(imagemin())
    .pipe(dest(`${paths.dist}/images`));
}

function assets() {
  return src(paths.assets, { allowEmpty: true, encoding: false })
    .pipe(dest(`${paths.dist}/assets`));
}

function prerender(done) {
  const run = require('./scripts/prerender');
  run({
    apiBaseUrl: env.API_BASE_URL,
    siteUrl: env.SITE_URL,
    defaultCity: env.DEFAULT_CITY,
    distDir: paths.dist,
    langs: LANGS.map((l) => ({ code: l.code, base: l.base, dict: loadDict(l.code) })),
  })
    .then(() => done())
    .catch((err) => {
      console.error('[prerender] failed:', err.message);
      done();
    });
}

function serve() {
  browserSync.init({
    server: { baseDir: paths.dist },
    port: Number(process.env.PORT) || env.DEV_PORT,
    notify: false,
    open: false,
  });

  watch(paths.scss.watch, styles);
  watch(paths.js.watch, scripts);
  watch([paths.html.watch], series(html, prerender)).on('change', browserSync.reload);
  watch(paths.images, series(images)).on('change', browserSync.reload);
  watch(paths.assets, series(assets)).on('change', browserSync.reload);
}

const build = series(
  clean,
  parallel(html, styles, scripts, images, assets),
  prerender,
);

exports.clean = clean;
exports.html = html;
exports.styles = styles;
exports.scripts = scripts;
exports.images = images;
exports.assets = assets;
exports.prerender = prerender;
exports.build = build;
exports.default = series(build, serve);
