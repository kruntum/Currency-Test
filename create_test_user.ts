import * as dotenv from 'dotenv';
dotenv.config();
import { auth } from './server/auth';

async function main() {
    try {
        await auth.api.signUpEmail({
            body: {
                name: "tummy",
                email: "test.plugins@currency.local",
                password: "password123"
            },
            asResponse: false
        });
        console.log("Success");
    } catch (e: any) {
        require('fs').writeFileSync('prisma_error.txt', String(e.stack || e));
        console.log("Error written to prisma_error.txt");
    }
}
main();
