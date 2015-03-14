var superagent = require( 'superagent' ),
    args = require( 'minimist' )( process.argv.slice( 2 ) ),
    _ = require( 'lodash' ),
    BASE_URL = 'https://api.github.com',
    TOKEN = args.token,
    FILENAME = args.out || 'repos.csv',
    TIMEOUT = args.timeout || 20000,
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
        repo.license + '\n'
    ].join(';');
}

function appendToFile( repo ) {
    fs.appendFile( FILENAME, repoToCsv( repo ) );
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

function request( n ) {
    if ( stopped ) {
        return;
    }

    superagent
        .get( BASE_URL + '/repositories' )
        .query({ since: n })
        .set( 'Authorization', 'Token ' + TOKEN )
        .end( function( err, res ) {
            if ( err ) {
                console.error( err );
                return;
            }

            var repos = JSON.parse( res.text );
            fetchSingle( _.first( repos ) );
            lastRepo = n;
        });
}

function kfyShuffle( array ) {
    var m = array.length, t, i;
    // While there remain elements to shuffle…
    while (m) {
        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}

function start() {
    // fact: github had 10M repos at the end of 2013
    // take a random 100K sample of all repos ever created before this one
    var ids = _.take( kfyShuffle( _.range( 32184889 ) ), Math.pow( 10, 5 ) );
        timers = [];

    console.log( ids );

    var timers = _.map( ids, function( id, i ) {
        return _.delay( request, i * TIMEOUT, id );
    });

    function stop() {
        if ( stopped ) {
            return;
        }
        stopped = true;
        _.each( timers, clearTimeout, this );
        
        console.log( 'last repo was', lastRepo );
    }

    process.on( 'SIGINT', stop );
    process.on( 'exit', stop ); 
}

fs.writeFileSync( FILENAME, 'id;name;stars;watchers;language;license\n' );
start();