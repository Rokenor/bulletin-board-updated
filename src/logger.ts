import pino from "pino";

const env = process.env.NODE_ENV;

const logger = pino({
  level: env === "test" ? "silent" : "info",
  ...(env !== "production" && {
    transport: {
      target: "pino-pretty",
    },
  }),
});

export default logger;
