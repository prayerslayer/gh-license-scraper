var assert = require( 'assert' );

var testRepos = [{
    id: 1,
    name: 'jekyll/jekyll',
    license: 'mit'
}, {
    id: 2,
    name: 'ruby/ruby',
    license: false,
    stars: 123
}];

function jsonToCsv( repos ) {
    return repos.reduce( function( str, repo ) {
        return str += repo.id + ';' + repo.name + ';' + repo.license + ';' + (repo.stars || -1) + ';\n';
    }, '');
}

var csv = jsonToCsv( testRepos );
console.log( csv );