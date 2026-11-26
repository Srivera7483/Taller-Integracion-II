declare module 'amqplib' {
  export function connect(url: string): Promise<any>;
}
