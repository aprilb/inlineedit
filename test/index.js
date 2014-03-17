// dependencies
var expect = require("expect.js");
var domify = require("domify");
var nextTick = require("next-tick");
var text = require("text");
var trigger = require("trigger-event");
var InlineEdit = require("inlineedit");

describe("InlineEdit(settings)", function () {
    var el = domify("<div>Hello World</div>");
    var instance = new InlineEdit({ element: el });

    it("should set the element property", function () {
        expect(instance.element).to.equal(el);
    });

    it("should wrap the element", function () {
        expect(instance.container).to.equal(el.parentNode);
    });

    it("should create a form with 3 elements", function () {
        expect(instance.form).to.be.ok();
        expect(instance.form.tagName).to.equal("FORM");
        expect(instance.form.elements).to.have.length(3);
    });

    it("should create a spinner element", function () {
        expect(instance.spinner).to.be.ok();
        expect(instance.spinner.tagName).to.equal("DIV");
        expect(text(instance.spinner)).to.equal("Saving…");
    });

    describe("states", function () {
        describe("ready", function () {
            it("should transition to 'editing' on click", function (done) {
                var instance = createInstance();

                trigger(instance.element, "click");

                nextTick(function () {
                    expect(instance.state).to.equal("editing");
                    destroyInstance(instance);
                    done();
                });
            });

            it("should restore the original element when returing from any other state", function (done) {
                var instance = createInstance({
                    initialState: "editing"
                });

                expect(instance.element.parentNode).to.not.be.ok();
                instance.transition("ready");

                nextTick(function () {
                    expect(instance.container.firstChild).to.be.equal(instance.element);
                    destroyInstance(instance);
                    done();
                });
            });

            it("should only display the original element", function () {
                var instance = createInstance();

                expect(instance.form.parentNode).to.not.be.ok();
                expect(instance.spinner.parentNode).to.not.be.ok();
                expect(instance.element.parentNode).to.equal(instance.container);

                destroyInstance(instance);
            });
        });

        describe("editing", function () {
            it("should transition to 'saving' on submit", function (done) {
                var instance = createInstance({
                    initialState: "editing",
                    submitForm: function (val, done) {
                        setTimeout(done, 10);
                    }
                });

                trigger(instance.form, "submit");

                nextTick(function () {
                    expect(instance.state).to.equal("saving");
                    destroyInstance(instance);
                    done();
                });
            });

            it("should transition to 'ready' on click", function (done) {
                var instance = createInstance({
                    initialState: "editing"
                });

                trigger(instance.form.querySelector(".inlineedit-cancel"), "click");

                nextTick(function () {
                    expect(instance.state).to.equal("ready");
                    destroyInstance(instance);
                    done();
                });
            });

            it("should only display the form", function () {
                var instance = createInstance({
                    initialState: "editing"
                });

                expect(instance.element.parentNode).to.not.be.ok();
                expect(instance.spinner.parentNode).to.not.be.ok();
                expect(instance.form.parentNode).to.equal(instance.container);

                destroyInstance(instance);
            });
        });

        describe("saving", function () {
            it("should transition to 'ready' on success (default)", function (done) {
                var instance = createInstance({
                    initialState: "saving"
                });

                nextTick(function () {
                    expect(instance.state).to.equal("ready");
                    destroyInstance(instance);
                    done();
                });
            });

            it("should transition to 'editing' on failure", function (done) {
                var instance = createInstance({
                    initialState: "saving",
                    submitForm: function (val, done) {
                        done(new Error("testing"));
                    }
                });

                nextTick(function () {
                    expect(instance.state).to.equal("editing");
                    destroyInstance(instance);
                    done();
                });
            });

            it("should emit a 'saved' event on success", function (done) {
                var instance = createInstance({
                    initialState: "saving",
                    submitForm: function (val, done) {
                        nextTick(done);
                    }
                });

                instance.on("saved", function () {
                    nextTick(function () {
                        destroyInstance(instance);
                        done();
                    });
                });
            });

            it("should emit an 'error' event on failure", function (done) {
                var instance = createInstance({
                    initialState: "saving",
                    submitForm: function (val, done) {
                        nextTick(function () {
                            done(new Error("testing"));
                        });
                    }
                });

                instance.on("error", function (err) {
                    expect(err).to.be.an(Error);
                    expect(err.message).to.equal("testing");
                    destroyInstance(instance);
                    done();
                });
            });

            it("should only display the spinner", function () {
                var instance = createInstance({
                    initialState: "saving",
                    submitForm: function (val, done) {
                        nextTick(done);
                    }
                });

                expect(instance.element.parentNode).to.not.be.ok();
                expect(instance.form.parentNode).to.not.be.ok();
                expect(instance.spinner.parentNode).to.equal(instance.container);

                destroyInstance(instance);
            });

            it("should update the value after success", function (done) {
                var instance = createInstance({
                    initialState: "editing"
                });

                instance.form.elements[0].value = "Foo Bar Baz";
                trigger(instance.form, "submit");

                nextTick(function () {
                    expect(instance.value).to.equal("Foo Bar Baz");
                    destroyInstance(instance);
                    done();
                });
            });
        });
    });

    describe("#parseValue(el)", function () {
        var fn = InlineEdit.prototype.parseValue;

        it("should return the text content of the element", function () {
            var el = document.createElement("div");
            text(el, "Hello World");

            expect(fn(el)).to.equal("Hello World");
        });

        it("should return a trimmed string", function () {
            var el = document.createElement("div");
            text(el, "  Hello World ");

            expect(fn(el)).to.equal("Hello World");
        });
    });

    describe("#formatValue(val, el)", function () {
        var fn = InlineEdit.prototype.formatValue;

        it("should set the text content of the element", function () {
            var el = document.createElement("div");
            fn("Hello World", el);

            expect(text(el)).to.equal("Hello World");
        });

        it("should trim the text content", function () {
            var el = document.createElement("div");
            fn("  Hello World   ", el);

            expect(text(el)).to.equal("Hello World");
        });
    });

    describe("#generateForm", function () {
        var prop = InlineEdit.prototype.generateForm;

        it("should be a string by default", function () {
            expect(prop).to.be.a("string");
        });

        it("should be our default form", function () {
            var frag = domify(prop);

            expect(frag.tagName).to.equal("FORM");
            expect(frag.elements[0].tagName).to.equal("INPUT");
            expect(frag.elements[1].tagName).to.equal("BUTTON");
            expect(frag.elements[2].tagName).to.equal("BUTTON");
        });

        it("should domify the string by default", function () {
            var instance = createInstance();

            expect(instance.form).to.be.a(HTMLFormElement);
            destroyInstance(instance);
        });

        it("should use an existing DOM element", function () {
            var el = domify("<form></form>");

            var instance = createInstance({
                generateForm: el
            });

            expect(instance.form).to.equal(el);
            destroyInstance(instance);
        });

        describe("using a function", function () {
            it("should use the instance as the context", function () {
                var instance = createInstance({
                    generateForm: function () {
                        expect(this).to.be.a(InlineEdit);
                        return "<form></form>";
                    }
                });

                destroyInstance(instance);
            });

            it("should use a returned element reference", function () {
                var el = document.createElement("form");

                var instance = createInstance({
                    generateForm: function () {
                        return el;
                    }
                });

                expect(instance.form).to.equal(el);
                destroyInstance(instance);
            });

            it("should domify a returned string", function () {
                var instance = createInstance({
                    generateForm: function () {
                        return "<div></div>";
                    }
                });

                expect(instance.form.tagName).to.equal("DIV");
                destroyInstance(instance);
            });
        });
    });

    describe("#generateSpinner", function () {
        var prop = InlineEdit.prototype.generateSpinner;

        it("should be a string by default", function () {
            expect(prop).to.be.a("string");
        });

        it("should be our default spinner", function () {
            var frag = domify(prop);

            expect(frag.tagName).to.equal("DIV");
            expect(text(frag)).to.contain("Saving");
        });

        it("should domify the string by default", function () {
            var instance = createInstance();

            expect(instance.spinner).to.be.a(HTMLDivElement);
            destroyInstance(instance);
        });

        it("should use an existing DOM element", function () {
            var el = domify("<div></div>");

            var instance = createInstance({
                generateSpinner: el
            });

            expect(instance.spinner).to.equal(el);
            destroyInstance(instance);
        });

        describe("using a function", function () {
            it("should use the instance as the context", function () {
                var instance = createInstance({
                    generateSpinner: function () {
                        expect(this).to.be.a(InlineEdit);
                        return "<form></form>";
                    }
                });

                destroyInstance(instance);
            });

            it("should use a returned element reference", function () {
                var el = document.createElement("div");

                var instance = createInstance({
                    generateSpinner: function () {
                        return el;
                    }
                });

                expect(instance.spinner).to.equal(el);
                destroyInstance(instance);
            });

            it("should domify a returned string", function () {
                var instance = createInstance({
                    generateSpinner: function () {
                        return "<span></span>";
                    }
                });

                expect(instance.spinner.tagName).to.equal("SPAN");
                destroyInstance(instance);
            });
        });
    });

    describe("#prepareForm(val, form)", function () {
        var fn = InlineEdit.prototype.prepareForm;

        it("should set the first input's value", function () {
            var el = domify("<form><input></form>");
            var input = el.elements[0];

            expect(input.value).to.equal("");
            fn("Hello World", el);
            expect(input.value).to.equal("Hello World");
        });

        it("should focus on the first input", function () {
            var el = domify("<form><input></form>");
            document.body.appendChild(el);

            fn("Hello World", el);
            expect(el.elements[0]).to.equal(document.activeElement);

            document.body.removeChild(el);
        });
    });

    describe("#processForm(form)", function () {
        var fn = InlineEdit.prototype.processForm;

        it("should return the first input's value", function () {
            var el = domify("<form><input value=\"Hello World\"></form>");

            expect(fn(el)).to.equal("Hello World");
        });
    });

    describe("#submitForm(val)", function () {
        var fn = InlineEdit.prototype.submitForm;

        it("should run the callback function", function (done) {
            fn(null, done);
        });

        it("should not pass arguments", function (done) {
            fn(null, function () {
                expect(arguments).to.not.have.length();
                done();
            });
        });
    });
});

function createInstance(o) {
    if (!o)         o = {};
    if (!o.element) o.element = domify("<div>Hello World</div>");

    document.body.appendChild(o.element);
    return new InlineEdit(o);
}

function destroyInstance(instance) {
    instance.destroy();
    document.body.removeChild(instance.element);
}