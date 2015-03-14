var superagent = require( 'superagent' ),
    args = require( 'minimist' )( process.argv.slice( 2 ) ),
    _ = require( 'lodash' ),
    BASE_URL = 'https://api.github.com',
    TOKEN = args.token,
    FILENAME = args.out || 'repos.csv',
    TIMEOUT = args.timeout || 90000,
    fs = require( 'fs' ),
    queue = [],
    stop = false,
    lastRepo = args.last;

function jsonToCsv( repos ) {
    return _.reduce( repos, function( str, repo ) {
        return str += [
            repo.id,
            repo.name,
            repo.stars,
            repo.watchers,
            repo.language,
            repo.license
        ].join(';') + ';\n';
    }, 'id;name;stars;watchers;language;license;\n');
}

function appendToFile( repos ) {
    var action = fs.existsSync( FILENAME ) ? 'appendFileSync' : 'writeFileSync';
    fs[ action ]( FILENAME, jsonToCsv( repos ) );
}

function save() {
    if ( stop ) {
        return;
    }
    stop = true;
    console.log( 'last repo was', lastRepo );
    appendToFile( queue );
}

function fetchSingle( repo ) {
    var retries = 0;
    console.log( 'Fetching', repo.full_name );
    superagent
        .get( BASE_URL + '/repos/' + repo.full_name )
        .set( 'Authorization', 'Token ' + TOKEN )
        .set( 'Accept', 'application/vnd.github.drax-preview+json' ) // otherwise no license info
        .end( function( err, res ) {
            if ( err ) {
                retries++;
                console.log( 'retrying', repo.full_name );
                return (retries > 3 || stop) ? false : fetchSingle( repo );
            }
            var full = JSON.parse( res.text );
            console.log( 'Got', full.full_name );
            queue.push({
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
    if ( stop ) {
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


requestNext();

process.on( 'SIGINT', save );
process.on( 'exit', save );