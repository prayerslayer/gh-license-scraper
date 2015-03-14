var superagent = require( 'superagent' ),
    args = require( 'minimist' )( process.argv.slice( 2 ) ),
    _ = require( 'lodash' ),
    BASE_URL = 'https://api.github.com',
    TOKEN = args.token,
    FILENAME = args.out || 'repos.csv',
    TIMEOUT = args.timeout || 40000,
    fs = require( 'fs' ),
    stopped = false,
    page = args.last || 0;

function repoToCsv( repo ) {
    return [
        repo.id,
        repo.name,
        repo.stars,
        repo.watchers,
        repo.language,
        repo.license + '\n'
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
    console.log( 'last page was', page );
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
        .get( BASE_URL + '/search/repositories' )
        .query({
            q: 'created:<2015-03-01',
            page: page,
            sort: 'stars'
         })
        .set( 'Authorization', 'Token ' + TOKEN )
        .end( function( err, res ) {
            if ( err ) {
                console.error( err );
                return;
            }
            var repos = JSON.parse( res.text );
            
            console.log( JSON.stringify( repos.items ) );

            _.forEach( repos.items, fetchSingle );
            
            if ( page < 333 ) {
                page++;
                setTimeout( requestNext, TIMEOUT );
            }
        });
}

fs.writeFileSync( FILENAME, 'id;name;stars;watchers;language;license\n' );
requestNext();

process.on( 'SIGINT', stop );
process.on( 'exit', stop );