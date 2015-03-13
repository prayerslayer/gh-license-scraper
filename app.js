var superagent = require( 'superagent' ),
    args = require( 'minimist' )( process.argv.slice( 2 ) ),
    _ = require( 'lodash' ),
    BASE_URL = 'https://api.github.com',
    TOKEN = args.token,
    FILENAME = args.filename || 'repos.csv',
    fs = require( 'fs' ),
    queue = [],
    stop = false,
    lastRepo = args.last;

function jsonToCsv( repos ) {
    return repos.reduce( function( str, repo ) {
        return str += repo.id + ';' + repo.name + ';' + repo.license + ';\n';
    }, '');
}

function appendToFile( repos ) {
    var action = fs.existsSync( FILENAME ) ? 'appendFileSync' : 'writeFileSync';
    fs[ action ]( FILENAME, jsonToCsv( repos ) );
}

function save() {
    stop = true;
    console.log( 'last repo was', lastRepo );
    appendToFile( queue );
}

function requestNext() {
    console.log( 'Requesting...' );
    if ( stop ) {
        return;
    }
    superagent
        .get( BASE_URL + '/repositories' )
        .query({ since: lastRepo || null })
        .set( 'Authorization', 'Token ' + TOKEN )
        .set( 'Accept', 'application/vnd.github.drax-preview+json' ) // otherwise no license info
        .end( function( err, res ) {
            if ( err ) {
                console.error( err );
                return;
            }
            var repos = JSON.parse( res.text ).map( function( repo ) {
                return {
                    id: repo.id,
                    name: repo.full_name,
                    license: repo.license ? repo.license.key : false
                };
            });
            console.log( repos );
            lastRepo = _.last( repos ).id;
            queue.push.apply( queue, repos );

            console.log( 'Now got', queue.length, 'repos' );
            setTimeout( requestNext, 1000 );
        });
}


requestNext();

process.on( 'SIGINT', save );
process.on( 'exit', save );