var superagent = require( 'superagent' ),
    shuffle = require( 'knuth-shuffle' ).knuthShuffle,
    args = require( 'minimist' )( process.argv.slice( 2 ) ),
    _ = require( 'lodash' ),
    BASE_URL = 'https://api.github.com',
    TOKEN = args.token,
    FILENAME = args.out || 'repos.csv',
    TIMEOUT = args.timeout || 20000,
    fs = require( 'fs' ),
    stopped = false,
    timers = [],
    before = args.before || '2015-03-01',
    strategy = args.strategy || 'popular',
    sampleSize = args.size || Math.pow( 10, 5 ),
    poolSize = args.pool || 32184889,
    page = args.last || 0;

if ( _.isUndefined( TOKEN ) ) {
    return console.error( 'You must provide an access token!' );
}

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
    _.each( timers, clearTimeout, this );
    console.log( 'Exiting...' );
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
        .set( 'Authorization', 'Token ' + TOKEN )
        .query({ since: n })
        .end( function( err, res ) {
            if ( err ) {
                return console.error( err );
            }

            var repos = JSON.parse( res.text );
            fetchSingle( _.first( repos ) );
        });
}

function requestNext() {
    if ( stopped ) {
        return;
    }
    superagent
        .get( BASE_URL + '/search/repositories' )
        .set( 'Authorization', 'Token ' + TOKEN )
        .query({
            q: 'created:<' + before,
            page: page,
            sort: 'stars'
         })
        .end( function( err , res ) {
            if ( err ) {
                return console.error( err );
            }
            var repos = JSON.parse( res.text );

            _.forEach( repos.items, fetchSingle );
            
            if( page < 333 ) {
                page++;
                timers.push( setTimeout( requestNext, TIMEOUT ) );
            }
        });
}

function startPopular() {
    requestNext();
}

function startSample() {
    // fact: github had 10M repos at the end of 2013
    // take a random 100K sample of all repos ever created before this one
    var ids = _.take( shuffle( _.range( poolSize ) ), sampleSize );

    timers = _.map( ids, function( id, i ) {
        return _.delay( request, i * TIMEOUT, id );
    });
}

process.on( 'SIGINT', stop );
process.on( 'exit', stop ); 

fs.writeFileSync( FILENAME, 'id;name;stars;watchers;language;license\n' );

if ( strategy === 'popular' ) {
    startPopular();
} else if ( strategy === 'sample' ) {
    startSample();
} else {
    console.error( 'Unknown strategy', strategy, 'Must be popular or sample.' );
}
