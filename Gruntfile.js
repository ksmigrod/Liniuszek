(function () {
    "use strict";

    module.exports = function (grunt) {

        require('load-grunt-tasks')(grunt);
        require('time-grunt')(grunt);
        // Project configuration.
        grunt.initConfig({
            jshint: {
                options: {
                    jshintrc: '.jshintrc',
                    reporter: require('jshint-stylish')
                },
                all: {
                    src: [
                        'Gruntfile.js',
                        'public_html/liniuszek.js'
                    ]
                }
            },
            clean: ['dist', '.tmp'],
            ngtemplates: {
                liniuszek: {
                    cwd: 'public_html',
                    src: ['line-edit.html'],
                    dest: '.tmp/template.js',
                    options: {
                        usemin: 'scripts/scripts.js',
                        htmlmin: {collapseWhitespace: true, collapseBooleanAttributes: true}
                    }
                }
            },
            ngAnnotate: {
                options: {
                    singleQuotes: true
                },
                dist: {
                    files: [{
                            expand: true,
                            cwd: '.tmp/concat/scripts',
                            src: 'scripts.js',
                            dest: '.tmp/concat/scripts'
                        }]
                }
            },
            useminPrepare: {
                html: 'public_html/index.html',
                options: {
                    flow: {
                        html: {
                            steps: {
                                js: ['concat', 'uglifyjs'],
                                css: ['cssmin']
                            },
                            post: {}
                        }
                    }
                }
            },
            copy: {
                release: {
                    files: [
                        {
                            expand: true,
                            cwd: 'public_html',
                            src: ['index.html'],
                            dest: 'dist'
                        }
                    ]
                }
            },
            filerev: {
                options: {
                    encoding: 'utf8',
                    algorithm: 'md5',
                    length: 20
                },
                release: {
                    // filerev:release hashes(md5) all assets (images, js and css )
                    // in dist directory
                    files: [{
                            src: [
                                'dist/images/*.{png,gif,jpg,svg}',
                                'dist/scripts/*.js',
                                'dist/styles/*.css'
                            ]
                        }]
                }
            },
            uglify: {
                options: {
                    mangle: {
			except: ['jsPDF']
		    },
		    screwIE8: true,
                }
            },
            usemin: {
                html: ['dist/*.html'],
                css: ['dist/styles/*.css'],
                options: {
                    assetsDirs: ['dist', 'dist/styles']
                }
            },
            htmlmin: {
                dist: {
                    options: {
                        collapseWhitespace: true,
                        collapseBooleanAttributes: true,
                        removeComments: true
                    },
                    files: [{
                            expand: true,
                            cwd: 'dist',
                            src: '*.html',
                            dest: 'dist'
                        }]
                }
            },
            processhtml: {
                options: {
                    commentMarker: 'process'
                },
                dist: {
                    files: {
                        'dist/index.html': ['dist/index.html']
                    }
                }
            }
        });
        // simple build task
        grunt.registerTask('build', [
            'clean',
            'jshint',
            'useminPrepare',
            'ngtemplates',
            'concat:generated',
            'ngAnnotate',
            'cssmin:generated',
            'uglify:generated',
            'copy',
            'filerev',
            'usemin',
            'processhtml:dist',
            'htmlmin:dist'
        ]);
    };
}());
