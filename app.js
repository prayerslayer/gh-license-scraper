var superagent = require( 'superagent' ),
    args = require( 'minimist' )( process.argv.slice( 2 ) ),
    _ = require( 'lodash' ),
    BASE_URL = 'https://api.github.com',
    TOKEN = args.token,
    FILENAME = args.out || 'repos.csv',
    TIMEOUT = args.timeout || 90000,
    fs = require( 'fs' ),
    stopped = false,
    lastRepo = args.last;

function repoToCsv( repo ) {
    return [
        repo.id,
        repo.name,
        repo.stars,
        repo.watchers,
        repo.language,
        repo.license,
        '\n'
    ].join(';');
}

function appendToFile( repo ) {
    fs.appendFile( FILENAME, repoToCsv( repo ) );
}

function stop() {
    if ( stopped ) {
        return;
    }
    stopped = true;
    console.log( 'last repo was', lastRepo );
}

function fetchSingle( repo ) {
    console.log( 'Fetching', repo.full_name );
    superagent
        .get( BASE_URL + '/repos/' + repo.full_name )
        .set( 'Authorization', 'Token ' + TOKEN )
        .set( 'Accept', 'application/vnd.github.drax-preview+json' ) // otherwise no license info
        .end( function( err, res ) {
            if ( err ) {
                return console.error( err );
            }
            var full = JSON.parse( res.text );
            console.log( 'Got', full.full_name );
            appendToFile({
                id: full.id,
                name: full.full_name,
                license : full.license ? full.license.key : 'none',
                stars: full.stargazers_count,
                watchers: full.watchers_count,
                language: full.language
            });
        });
}

function requestNext() {
    console.log( 'Requesting batch...' );
    if ( stopped ) {
        return;
    }
    superagent
        .get( BASE_URL + '/repositories' )
        .query({ since: lastRepo || null })
        .set( 'Authorization', 'Token ' + TOKEN )
        .end( function( err, res ) {
            if ( err ) {
                console.error( err );
                return;
            }
            var repos = JSON.parse( res.text );
            
            lastRepo = _.last( repos ).id;

            _.forEach( repos, fetchSingle );
            
            setTimeout( requestNext, TIMEOUT );
        });
}

fs.writeFileSync( FILENAME, 'id;name;stars;watchers;language;license;\n' );
requestNext();

process.on( 'SIGINT', stop );
process.on( 'exit', stop );