// ==========================================
// 0. DEPENDENCIES
// ==========================================

// node libraries
import fs, { truncate } from 'fs';
//import { copyFile } from 'fs/promises';
import { copyFile } from 'fs';
import del from 'del';
import path, { resolve } from 'path';


// gulp-dev-dependencies
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';

import {rollup} from 'rollup';
import rollupNodeResolve from '@rollup/plugin-node-resolve';
import rollupBabel from '@rollup/plugin-babel';
import rollupJson from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';

import slugify from 'slugify';
import latinize from 'latinize';
import mapStream from 'map-stream';

import browserSync from 'browser-sync';

import postcssAutoprefixer from 'autoprefixer';
import postcssCssnano from 'cssnano';

const sharp = require('sharp');
sharp.cache(false);


// ==========================================
// 0. INITIALIZATION
// ==========================================

// node environment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
process.env.NODE_ENV = 'development';


// dev-dependencies
const slugifyCustomDefaultSettings = {
  replacement: '-',  // replace spaces with replacement character, defaults to `-`
  remove: /[*+~.()'"!:@]/g, // remove characters that match regex, defaults to `undefined`
  lower: true,      // convert to lower case, defaults to `false`
  strict: true,     // strip special characters except replacement, defaults to `false`
  locale: 'cs'       // language code of the locale to use
};
const pkg = require('./package.json');
const $ = gulpLoadPlugins();
const version = pkg.version;

// ==========================================
// 2. FUNCTIONS
// ==========================================

function fileContents(filePath, file) {
  return file.contents.toString();
}

const getCleanUpJSONFromImgTags = (jsonString, pattern = '<img[^<]+>') => {

  return jsonString.replace(new RegExp(pattern, "gmi"), '');

};

// ==========================================
// CONFIG
// ==========================================
const config = {

  // COMMAND ARGUMENTS
  cmd: {
    // check if 'gulp --production'
    // http://stackoverflow.com/questions/28538918/pass-parameter-to-gulp-task#answer-32937333
    production: process.argv.indexOf('--production') > -1 || false,
    // cviceni: {
    //   index: process.argv.indexOf('--cviceni') || false,
    //   value: config.cmd.cviceni.index > -1 ? process.argv[config.cmd.cviceni.index + 1] : false,
    // },
  },
  // FOLDERS
  src: {
    folder: 'src/',
    data: {
      folder: 'src/data/',
      json: 'src/data/**/*.json',
      bundle: 'src/data/cviceni.json',
    },
    img: {
      folder: 'src/img/',
      files: 'src/img/**/*.{jpg,png,svg,gif}',
    },
  },
  dist: {
    folder: 'dist/',
  },
  // plugin settings
  // IMAGES
  images: {},
  // PLUMBER
  // POSTCSS
  // ROLLUP
  rollup: {
  },
};

const appConfig = {

  "images": {
    "object": {
      "full": {
        "width": 1920
      },
      "thumbnail": {
        "width": 218,
        "height": 158
      },
      "galleryThumbnail": {
        "width": 743,
        "height": 460
      }
    }
  },

};

// ==========================================
// 4. TASKS
// ==========================================

const prepareObjectJsonWithImages = async (doneResult) => {

  const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'tiff', 'tif'];
  const generateThumbnailImages = true;

  let mainJson = {};

  // create ./output
  try {
    // first check if directory already exists
    if (!fs.existsSync(`./output/`)) {
        fs.mkdirSync(`./output/`);
        console.log("Directory is created.");
    } else {
        console.error("Directory already exists.");
    }
  } catch (err) {
    console.error(err);
  }

  // create new directory in ./output
  try {
    // first check if directory already exists
    if (!fs.existsSync(`./output/data-maps/`)) {
        fs.mkdirSync(`./output/data-maps/`);
        //console.log("Directory is created.");
    } else {
        //console.log("Directory already exists.");
    }
  } catch (err) {
    console.error(err);
  }

  gulp.src('./data-maps/*') // :TODO: use different file to start processing
  .pipe(mapStream(async (thisFolder, done) => {

    const parentFolderName = path.basename(thisFolder.path); // map folder

    mainJson[parentFolderName] = {};

    const parentFolderPath = thisFolder.path;

    const subfolderImageFolders = fs.readdirSync(parentFolderPath);


    // Process objects of the map
    //////////////////////////////////////////////////////////////////////////////////////////

    subfolderImageFolders.filter(item => item !== '.DS_Store').forEach(subFolderName => {

      const subFolderNormalizedSlug = latinize(slugify(subFolderName.normalize('NFC'), slugifyCustomDefaultSettings)).toLowerCase();

      mainJson[parentFolderName][subFolderNormalizedSlug] = [];

      const thisFilePath = `${parentFolderPath}${path.sep}${subFolderName}`;

      // get a file list from the folder
      let subfolderImagesFilesArray = fs.readdirSync(thisFilePath);

      subfolderImagesFilesArray = subfolderImagesFilesArray.filter(itemName => itemName != '.DS_Store');

      if (subfolderImagesFilesArray && subfolderImagesFilesArray.length && subfolderImagesFilesArray.length > 0) {


        subfolderImagesFilesArray.forEach(async imageName => {

          const thisFilename = imageName.normalize('NFKD');

          const thisImageFilePath = `${parentFolderPath}${path.sep}${subFolderName}${path.sep}${imageName}`;
          const thisFileImageExtension = path.extname(thisFilename);
          let thisFileImageExtensionWithoutDot = thisFileImageExtension.split('.');

          if (thisFileImageExtensionWithoutDot.length > 1) {
            thisFileImageExtensionWithoutDot = thisFileImageExtensionWithoutDot[1].toLowerCase();
          }

          // process only if the file  type is allowed
          // (based only on the file extension, not the binary data)
          if (allowedImageExtensions.includes(thisFileImageExtensionWithoutDot)) {

            const thisFilenameOnly = path.basename(thisFilename, thisFileImageExtension);

            const imageObj = {};

            const fileNameNormalize = latinize(slugify(`${thisFilenameOnly}`).toLowerCase());

            imageObj.name = `${fileNameNormalize}-full.webp`;
            imageObj.galleryThumbnail = `${fileNameNormalize}-gallery.webp`;
            imageObj.thumbnail = `${fileNameNormalize}-thumb.webp`;


            mainJson[parentFolderName][subFolderNormalizedSlug].push(imageObj);


            if (generateThumbnailImages) {

              // check if map folder exists
              try {
                // first check if directory already exists
                if (!fs.existsSync(`./output/data-maps/${parentFolderName}/`)) {
                    fs.mkdirSync(`./output/data-maps/${parentFolderName}/`);
                    //console.log("Directory is created.");
                } else {
                    //console.log("Directory already exists.");
                }
              } catch (err) {
                console.error(err);
              }

              const thisObjectOutputFolderNamePathForImages = `./output/data-maps/${parentFolderName}/${subFolderNormalizedSlug}`;

              // check if map object folder exists
              try {
                // first check if directory already exists
                if (!fs.existsSync(thisObjectOutputFolderNamePathForImages)) {
                    fs.mkdirSync(thisObjectOutputFolderNamePathForImages);
                    //console.log("Directory is created.");
                } else {
                    //console.log("Directory already exists.");
                }
              } catch (err) {
                console.error(err);
              }

              const imageNameFullSizeWebpPath = `${thisObjectOutputFolderNamePathForImages}${path.sep}${imageObj.name}`;
              const imageNameGallerySizeWebpPath = `${thisObjectOutputFolderNamePathForImages}${path.sep}${imageObj.galleryThumbnail}`;
              const imageNameThumbSizeWebpPath = `${thisObjectOutputFolderNamePathForImages}${path.sep}${imageObj.thumbnail}`;

              let image = await sharp(thisImageFilePath);

              // do image processing only if the largest/main does not exist
              if (!fs.existsSync(imageNameFullSizeWebpPath)) {

                const imageWidth = (await image.metadata()).width;

                image.resize({width: appConfig.images.object.full.width}); // resize even if the image is smaller (upsize)
                await image.toFile(imageNameFullSizeWebpPath);

                // // check if the original image size is larger than the max full width size defined in the app settings
                // // if (!fs.existsSync(imageNameGallerySizeWebpPath)) {

                //   // generate, resize, rename gallery thumb
                  image
                  .resize({width: appConfig.images.object.galleryThumbnail.width}) // resize
                  .toFile(imageNameGallerySizeWebpPath); // save

                // // } else {
                // //   // :TODO: write a message to console that the image is skipped
                // // }

                // // if (!fs.existsSync(imageNameThumbSizeWebpPath)) {

                //   // generate, resize, rename image thumb
                  image
                  .resize({width: appConfig.images.object.thumbnail.width, fit: 'cover'}) // resize
                  .toFile(imageNameThumbSizeWebpPath); // save

                // }

                image = null;


              }



            }


          }


        });

        //console.log("mainJson", mainJson);

      }


    });


    done();
    doneResult();


  }));


};

const cleanTempDataFolder = (done) => {
  return del(['temp/data-maps'], done);
};

const copyToDist = (done) => {

  gulp.src(['.htaccess'])
  .pipe(gulp.dest('./dist/'));

  done();

};
const copyTempDataToSrc = (done) => {

  gulp.src(['./output/data-maps/**/*'])
  .pipe(gulp.dest('./src/data-maps/'));

  done();

};

const copySrcDataToDist = (done) => {

  gulp.src(['./src/data-maps/**/*'])
  .pipe(gulp.dest('./dist/assets/data-maps/'));

  done();

};

// CLEAN
gulp.task('clean', (done) => {
  return del(['dist'], done);
});

gulp.task('clean-temp', (done) => {
  return del(['temp'], done);
});

// GULP:prepare
gulp.task('build-images', gulp.series(prepareObjectJsonWithImages));


// GULP:build

// GULP:default
gulp.task('default', gulp.series(prepareObjectJsonWithImages));
