'use strict';
var path = require('path');
var util = require('util');
var spawn = require('child_process').spawn;
var yeoman = require('yeoman-generator');


var Generator = module.exports = function Generator(args, options) {
  yeoman.generators.Base.apply(this, arguments);
  this.argument('appname', { type: String, required: false });
  this.appname = this.appname || path.basename(process.cwd());

  args = ['main'];

  if (typeof this.env.options.appPath === 'undefined') {
    try {
      this.env.options.appPath = require(path.join(process.cwd(), 'bower.json')).appPath;
    } catch (e) {}
    this.env.options.appPath = this.env.options.appPath || 'app';
  }

  this.appPath = this.env.options.appPath;

  if (typeof this.env.options.coffee === 'undefined') {
    this.option('coffee');

    // attempt to detect if user is using CS or not
    // if cml arg provided, use that; else look for the existence of cs
    if (!this.options.coffee &&
      this.expandFiles(path.join(this.appPath, '/scripts/**/*.coffee'), {}).length > 0) {
      this.options.coffee = true;
    }

    this.env.options.coffee = this.options.coffee;
  }

  if (typeof this.env.options.minsafe === 'undefined') {
    this.option('minsafe');
    this.env.options.minsafe = this.options.minsafe;
    args.push('--minsafe');
  }

  this.hookFor('angular-express:common', {
    args: args
  });

  this.hookFor('angular-express:main', {
    args: args
  });

  this.hookFor('angular-express:controller', {
    args: args
  });

  this.hookFor('karma', {
    as: 'app',
    options: {
      options: {
        coffee: this.options.coffee,
        travis: true,
        'skip-install': this.options['skip-install']
      }
    }
  });

  this.on('end', function () {
    this.installDependencies({ skipInstall: this.options['skip-install'] });
  });

  this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));
};

util.inherits(Generator, yeoman.generators.Base);

Generator.prototype.askForBootstrap = function askForBootstrap() {
  var cb = this.async();

  this.prompt([{
    type: 'confirm',
    name: 'bootstrap',
    message: 'Would you like to include Twitter Bootstrap?',
    default: true
  }, {
    type: 'list',
    name: 'bootstrapType',
    message: 'How would you like to implement Twitter Bootstrap?',
    choices: [{
      name: 'Use the Bootstrap LESS Framework and LESS middleware',
      value: 'less'
    }, {
      name: 'Use Bootstrap-SASS, with the Compass CSS Authoring Framework',
      value: 'sass'
    }, {
      name: 'Use vanilla Bootstrap Framework with precompiled CSS',
      value: 'css'
    }],
    when: function (props) {
      return props.bootstrap;
    }
  }], function (props) {
    this.bootstrap = props.bootstrap;
    this.compassBootstrap = this.lessBootstrap = this.cssBoostrap = false;
    if (this.bootstrap) {
      if (props.bootstrapType === 'less') {
        this.lessBootstrap = true;
      } else if (props.bootstrapType === 'sass') {
        this.compassBootstrap = true;
      } else {
        this.cssBoostrap = true;
      }
    } else {
      this.cssBootstrap = true;
    }

    cb();
  }.bind(this));
};

Generator.prototype.askForModules = function askForModules() {
  var cb = this.async();

  var prompts = [{
    type: 'checkbox',
    name: 'modules',
    message: 'Which modules would you like to include?',
    choices: [{
      value: 'resourceModule',
      name: 'angular-resource.js',
      checked: true
    }, {
      value: 'cookiesModule',
      name: 'angular-cookies.js',
      checked: true
    }, {
      value: 'sanitizeModule',
      name: 'angular-sanitize.js',
      checked: true
    }]
  }];

  this.prompt(prompts, function (props) {
    var hasMod = function (mod) { return props.modules.indexOf(mod) !== -1; };
    this.resourceModule = hasMod('resourceModule');
    this.cookiesModule = hasMod('cookiesModule');
    this.sanitizeModule = hasMod('sanitizeModule');

    cb();
  }.bind(this));
};


Generator.prototype.askForJade = function askForJade() {
  var cb = this.async();

  this.prompt([{
    type: 'confirm',
    name: 'jade',
    message: 'Would you like to include Jade template engine?',
    default: true
  }], function (props) {
    this.jade = props.jade;
    cb();
  }.bind(this));
};

Generator.prototype.askForSocketIO = function askForSocketIO() {
  var cb = this.async();

  this.prompt([{
    type: 'confirm',
    name: 'socketIO',
    message: 'Would you like to include Socket.IO with your Express Server?',
    default: true
  }], function (props) {
    this.socketIO = props.socketIO;
    cb();
  }.bind(this));
};

Generator.prototype.prepareIndexFile = function prepareIndexFile() {
  this.indexFile = this.engine(this.read('../../templates/common/index.' + (this.jade ? "jade" : "html")),
      this);
}
// Waiting a more flexible solution for #138
Generator.prototype.bootstrapFiles = function bootstrapFiles() {
  var less = this.lessBootstrap,
      sass = this.compassBootstrap,
      css = this.cssBoostrap;
  var files = [];
  var source = 'styles/' + ( less ? 'less/' :  sass ? 'scss/' : 'css/' );

  if (less) {
    files.push('main.less');
  } else if (sass) {
    files.push('main.scss');
    this.copy('images/glyphicons-halflings.png', 'app/images/glyphicons-halflings.png');
    this.copy('images/glyphicons-halflings-white.png', 'app/images/glyphicons-halflings-white.png');
  } else {
    files.push('main.css');
  }

  files.forEach(function (file) {
    this.template(source + file, 'app/styles/' + file);
  }.bind(this));

  var routeAppend = function routeAppend(cond, hash, gener) {
    if (cond) {
      return appendFilesToJade(hash);
    } else {
      return gener.appendFiles(hash);
    }
  };

  if (this.bootstrap && css) {
    this.indexFile = routeAppend(this.jade, {
      html: this.indexFile,
      fileType: 'css',
      optimizedPath: 'bower_components/bootstrap/dist/css/bootstrap.css',
      sourceFileList: ['bower_components/bootstrap/dist/css/bootstrap.css'],
      searchPath: '.app'
    }, this);
  }

  this.indexFile = routeAppend(this.jade, {
    html: this.indexFile,
    fileType: 'css',
    optimizedPath: 'styles/main.css',
    sourceFileList: files.map(function (file) {
      return 'styles/' + file.replace(/\.less|\.scss/gi, '.css');
    }),
    searchPath: '.tmp'
  }, this);
};

function appendScriptsJade(jade, optimizedPath, sourceFileList, attrs) {
  return appendFilesToJade(jade, 'js', optimizedPath, sourceFileList, attrs);
};

Generator.prototype.bootstrapJs = function bootstrapJs() {
  var list;
  if (!this.bootstrap) {
    return;  // Skip if disabled.
  }

  var sass = (this.compassBootstrap ? '-sass' : '');

  list = [
    'bower_components/bootstrap' + sass + '/js/affix.js',
    'bower_components/bootstrap' + sass + '/js/alert.js',
    'bower_components/bootstrap' + sass + '/js/dropdown.js',
    'bower_components/bootstrap' + sass + '/js/tooltip.js',
    'bower_components/bootstrap' + sass + '/js/modal.js',
    'bower_components/bootstrap' + sass + '/js/transition.js',
    'bower_components/bootstrap' + sass + '/js/button.js',
    'bower_components/bootstrap' + sass + '/js/popover.js',
    'bower_components/bootstrap' + sass + '/js/carousel.js',
    'bower_components/bootstrap' + sass + '/js/scrollspy.js',
    'bower_components/bootstrap' + sass + '/js/collapse.js',
    'bower_components/bootstrap' + sass + '/js/tab.js'
  ];
  // Wire Twitter Bootstrap plugins
  if (this.jade) {
    this.indexFile = appendScriptsJade(this.indexFile, 'scripts/plugins.js', list);
  } else {
    this.indexFile = this.appendScripts(this.indexFile, 'scripts/plugins.js', list);
  }
};

Generator.prototype.socketIOJS = function socketIOJS() {
  if (!this.socketIO) {
    return;
  }

  var socketSrc = ['/socket.io/socket.io.js'];

  if (this.jade) {
    this.indexFile = appendScriptsJade(this.indexFile, 'scripts/plugins.js', socketSrc);
  } else {
    this.indexFile = this.appendScripts(this.indexFile, 'scripts/plugins.js', socketSrc);
  }
};

Generator.prototype.extraModules = function extraModules() {
  var modules = [];
  if (this.resourceModule) {
    modules.push('bower_components/angular-resource/angular-resource.js');
  }

  if (this.cookiesModule) {
    modules.push('bower_components/angular-cookies/angular-cookies.js');
  }

  if (this.sanitizeModule) {
    modules.push('bower_components/angular-sanitize/angular-sanitize.js');
  }

  if (modules.length) {
    if (this.jade) {

    } else {
      this.indexFile = this.appendScripts(this.indexFile, 'scripts/modules.js',
          modules);
    }
  }
};

function spacePrefix(jade, block){
  var prefix;
  jade.split("\n").forEach( function (line) { if( line.indexOf(block)> -1 ) {
    prefix = line.split("/")[0];
  }});
  return prefix;
}

function generateJadeBlock(blockType, optimizedPath, filesBlock, searchPath, prefix) {
  var blockStart, blockEnd;
  var blockSearchPath = '';

  if (searchPath !== undefined) {
    if (util.isArray(searchPath)) {
      searchPath = '{' + searchPath.join(',') + '}';
    }
    blockSearchPath = '(' + searchPath +  ')';
  }

  blockStart = '\n' + prefix + '// build:' + blockType + blockSearchPath + ' ' + optimizedPath + ' \n';
  blockEnd = prefix + '// endbuild\n' + prefix;
  return blockStart + filesBlock + blockEnd;
};

function appendJade(jade, tag, blocks){
  var mark = "//- build:" + tag,
      position = jade.indexOf(mark);
  return [jade.slice(0, position), blocks, jade.slice(position)].join('');
}

function appendFilesToJade(jadeOrOptions, fileType, optimizedPath, sourceFileList, attrs, searchPath) {
  var blocks, updatedContent, prefix, jade, files = '';
  jade = jadeOrOptions;
  if (typeof jadeOrOptions === 'object') {
    jade = jadeOrOptions.html;
    fileType = jadeOrOptions.fileType;
    optimizedPath = jadeOrOptions.optimizedPath;
    sourceFileList = jadeOrOptions.sourceFileList;
    attrs = jadeOrOptions.attrs;
    searchPath = jadeOrOptions.searchPath;
  }
  if (fileType === 'js') {
    prefix = spacePrefix(jade, "build:body");
    sourceFileList.forEach(function (el) {
      files += prefix + 'script(' + (attrs||'') + 'src="' + el + '")\n';
    });
    blocks = generateJadeBlock('js', optimizedPath, files, searchPath, prefix);
    updatedContent = appendJade(jade, 'body', blocks);
  } else if (fileType === 'css') {
    prefix = spacePrefix(jade, "build:head");
    sourceFileList.forEach(function (el) {
      files += prefix + 'link(' + (attrs||'') + 'rel="stylesheet", href="' + el  + '")\n';
    });
    blocks = generateJadeBlock('css', optimizedPath, files, searchPath, prefix);
    updatedContent = appendJade(jade, 'head', blocks);
  }
  return updatedContent;
}

Generator.prototype.appJs = function appJs() {
  if (this.jade) {
    this.indexFile = appendFilesToJade({
      html: this.indexFile,
      fileType: 'js',
      optimizedPath: 'scripts/scripts.js',
      sourceFileList: ['scripts/app.js'],
      searchPath: ['.tmp', 'app']
    });
  } else {
    this.indexFile = this.appendFiles({
      html: this.indexFile,
      fileType: 'js',
      optimizedPath: 'scripts/scripts.js',
      sourceFileList: ['scripts/app.js', 'scripts/controllers/main.js'],
      searchPath: ['.tmp', 'app']
    });
  }
};



Generator.prototype.createIndexJade = function createIndexJade() {
  if(this.jade) {
    this.write(path.join(this.appPath, 'jade/index.jade'), this.indexFile);
  }
};

Generator.prototype.createIndexHtml = function createIndexHtml() {
  if(!this.jade) {
    this.write(path.join(this.appPath, 'index.html'), this.indexFile);
  }
};

Generator.prototype.createExpressServer = function createExpressServer() {
  this.template('../../templates/common/server/main.js', 'server/main.js');
};

Generator.prototype.packageFiles = function () {
  this.template('../../templates/common/_bower.json', 'bower.json');
  this.template('../../templates/common/_package.json', 'package.json');
  this.template('../../templates/common/Gruntfile.js', 'Gruntfile.js');
};

Generator.prototype.addHtmlJade = function addHtmlJade() {
  if(this.jade) {
    this.copy('../../templates/common/jade/views/main.jade', 'app/jade/views/main.jade');
  }
};

Generator.prototype.addHtmlViews = function addHtmlViews() {
  if(!this.jade) {
    this.copy('../../templates/common/views/main.html', 'app/views/main.html');
  }
};
