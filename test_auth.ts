import { auth } from './server/auth';

async function test() {
    console.log(Object.keys(auth.api));
}

test();
