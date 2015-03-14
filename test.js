var superagent = require( 'superagent' ),
    BASE_URL = 'https://api.github.com',
    args = require( 'minimist' )( process.argv.slice( 2 ) ),
    TOKEN = args.token;

superagent
    .get( BASE_URL + '/search/repositories' )
    .query({
        q: 'created:<2015-03-01',
        page: 0,
        perPage: 100,
        sort: 'stars',
        order: 'desc'
     })
    .set( 'Authorization', 'Token ' + TOKEN )
    .end( function( err, res ) {
        if ( err ) {
            return console.log( err );
        }
        console.log( JSON.stringify( JSON.parse( res.text ), null, 4 ) );
    });