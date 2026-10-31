import crypto from 'crypto';
    export const generateOTP = () => {
      const buffer = crypto.randomBytes(3);
      return parseInt(buffer.toString('hex'), 16).toString().substr(0, 6);
    };

