var _ = require( 'lodash' );

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

var start = Date.now();

_.take( kfyShuffle( _.range( 32184889 ) ), Math.pow( 10, 5 ) );

var end = Date.now();

console.log( 'took', end - start );