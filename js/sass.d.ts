declare namespace Sass {
    function compile(code: string, options: any, callback: (code: {text: string}) => void): void;
    enum style {
        nested,
		expanded,
		compact,
		compressed
    }
    enum comments {
        none,
        default
    }
}