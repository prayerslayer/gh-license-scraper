var superagent = require( 'superagent' ),
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
    _.each( timers, clearTimeout, this );
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

function startPopular() {
    requestNext();
}

function startSample() {
    // fact: github had 10M repos at the end of 2013
    // take a random 100K sample of all repos ever created before this one
    var ids = _.take( kfyShuffle( _.range( 32184889 ) ), Math.pow( 10, 5 ) );

    timers = _.map( ids, function( id, i ) {
        return _.delay( request, i * TIMEOUT, id );
    });
}

process.on( 'SIGINT', stop );
process.on( 'exit', stop ); 

fs.writeFileSync( FILENAME, 'id;name;stars;watchers;language;license\n' );

if ( args.strategy === 'popular' ) {
    startPopular();
} else if ( args.strategy === 'sample' ) {
    startSample();
} else {
    console.error( 'Unknown strategy', args.strategy, 'Must be popular or sample.' );
}
