var assert = require( 'assert' ),
    _ = require( 'lodash' );

var testRepos = [{
    id: 1,
    name: 'jekyll/jekyll',
    license: 'mit',
    watchers: 23
}, {
    id: 2,
    name: 'ruby/ruby',
    license: false,
    stars: 123
}];

function jsonToCsv( repos ) {
    return _.reduce( repos, function( str, repo ) {
        return str += [
                    repo.id,
                    repo.name,
                    repo.stars,
                    repo.watchers,
                    repo.license
                ].join(';') + ';\n';
    }, 'id;name;stars;watchers;license;\n');
}

var csv = jsonToCsv( testRepos );
console.log( csv );