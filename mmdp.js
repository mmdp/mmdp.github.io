var mmdp = {
    size: 128
};

mmdp.Block = function(start, length) {
    this.start = m.prop(start);
    this.length = length;
    this.end = function() {
        return this.start() + this.length;
    };
}

mmdp.Task = function(pid, length) {
    this.pid = pid;
    this.length = length;
}

mmdp.BlockList = Array;

mmdp.create_task_block = function(start, task) {
    var b = new mmdp.Block(start, task.length);
    b.pid = task.pid;
    return b;
}

mmdp.vm = (function() {
    var vm = {};
    vm.init = function() {
        vm.process_list = new mmdp.BlockList();
        vm.empty_list = new mmdp.BlockList();
        vm.place_alg = m.prop('First fit');

        vm.task_count = 0;
        vm.clear_task = function() {
            vm.task_value = {
                length: ''
            };
        };
        vm.clear_task();
        vm.task = function(length) {
            console.log('run task');
            vm.not_found = false;
            if (arguments.length === 0) {
                //console.log('read', vm.task_value);
                if (typeof vm.task_value === 'undefined') {
                    return {
                        length: ''
                    };
                } else {
                    return vm.task_value;
                }
            } else if (!isNaN(length) && length > 0) {
                vm.task_count += 1;
                vm.task_value = new mmdp.Task(vm.task_count, 1 * length);
                console.log('write', vm.task_value);
            } else {
                console.log('not num');
            }
        };

        vm.add_task = function() {
            if (vm.task().length === '') {
                return;
            }

            if (vm.place_alg() === 'Next fit') {
                // Next fit
                console.log('Next fit');
                var last_task = vm.process_list[vm.process_list.length - 1];
                // Find after last task
                var index = vm.empty_list.findIndex(empty_block =>
                    empty_block.start() > last_task.start() && empty_block.length > vm.task().length);
                // Or before
                if (index < 0) {
                    index = vm.empty_list.findIndex(empty_block =>
                        empty_block.start() < last_task.start() && empty_block.length > vm.task().length);
                }
                // Not found
                if (index < 0) {
                    vm.not_found = true;
                    return;
                }
            } else if (vm.place_alg() === 'Best fit') {
                // Best fit
                console.log('Best fit');
                var found_block = vm.empty_list.slice().sort((a, b) => a.length - b.length)
                    .find(empty_block => empty_block.length >= vm.task().length);
                // Not found
                if (typeof found_block === 'undefined') {
                    vm.not_found = true;
                    return;
                }
                var index = vm.empty_list.findIndex(empty_block =>
                    empty_block.start() === found_block.start());
            } else {
                // First fit
                console.log('First fit');
                var index = vm.empty_list.findIndex(empty_block =>
                    empty_block.length >= vm.task().length);
                // Not found
                if (index < 0) {
                    vm.not_found = true;
                    return;
                }
            }

            var empty_block = vm.empty_list[index];
            // Add task to process list
            vm.process_list.push(mmdp.create_task_block(empty_block.start(), vm.task()));
            // Remove used empty block
            vm.empty_list.splice(index, 1);
            // Add left empty block
            if (empty_block.length > vm.task().length) {
                vm.empty_list.splice(index, 0, new mmdp.Block(empty_block.start() + vm.task().length,
                    empty_block.length - vm.task().length));
            }
            vm.clear_task();
        };

        vm.rm_task = function(pid) {
            var process_block = vm.process_list.find(process_block =>
                process_block.pid === pid);
            var new_empty = new mmdp.Block(process_block.start(), process_block.length);
            var next_index = vm.empty_list.findIndex(empty_block =>
                empty_block.start() > process_block.start());
            if (next_index >= 0) {
                var next_empty = vm.empty_list[next_index];
                // Insert new empty block to empty_list
                vm.empty_list.splice(next_index, 0, new_empty);
                // Combine with next empty block
                if (next_empty.start() === new_empty.end()) {
                    new_empty.length += next_empty.length;
                    vm.empty_list.splice(next_index + 1, 1); // next_index is new_empty
                }
            } else { // Next empty block is not found
                var next_index = vm.empty_list.length;
                vm.empty_list.splice(next_index, 0, new_empty);
                // EQUALS TO empty_list.push(new_empty);
            }
            if (next_index > 0) { // Previous empty block exists
                var prev_empty = vm.empty_list[next_index - 1];
                // Combine with previous empty block
                if (prev_empty.end() === new_empty.start()) {
                    new_empty.start(prev_empty.start());
                    new_empty.length += prev_empty.length;
                    vm.empty_list.splice(next_index - 1, 1);
                }
            }
            vm.process_list.splice(vm.process_list.indexOf(process_block), 1);
        };

        vm.combine_list = function() {
            var block_list = vm.empty_list.concat(vm.process_list);
            block_list.sort(function(a, b) {
                return a.start() - b.start();
            });
            return block_list;
        }

    };
    return vm;
})();

mmdp.view = function() {
    return m('div', {
        align: 'center'
    }, [
        m('h2', 'Memory Management'),
        m('h4', 'Dynamic Partitioning'),
        m('form[onSubmit="return false;"]', {
            class: 'pure-form'
        }, [
            m('select', {
                value: mmdp.vm.place_alg(),
                onchange: m.withAttr('value', mmdp.vm.place_alg)
            }, [
                m('option', 'First fit'),
                m('option', 'Best fit'),
                m('option', 'Next fit'),
            ]),
            m('input[type=text]', {
                style: {
                    'width': '162px',
                    'margin-left': '10px',
                },
                pattern: mmdp.vm.not_found ? '' : '[0-9]*',
                title: mmdp.vm.not_found ? 'Out of memory!' : 'Invalid size!',
                placeholder: 'Size',
                value: mmdp.vm.task().length,
                onchange: m.withAttr('value', mmdp.vm.task),
                onfocus: m.withAttr('value', (v) => {
                    if (v === '') mmdp.vm.not_found = false;
                }),
            }),
            m('button', {
                class: 'pure-button',
                style: {
                    'margin-left': '10px'
                },
                onclick: mmdp.vm.add_task
            }, 'Add task'),
        ]),
        m('table', {
            class: 'pure-table pure-table-horizontal',
            style: {
                margin: '10px'
            }
        }, [
            m('thead', [
                m('tr', [
                    m('th', 'Pid'),
                    m('th', 'Start'),
                    m('th', 'End'),
                    m('th', 'Size'),
                    m('th', 'Action')
                ])
            ]),
            m('tbody', {
                align: 'center'
            }, [
                mmdp.vm.combine_list().map(function(block, index) {
                    return m('tr', {
                        style: {
                            'height': '52px'
                        }
                    }, [
                        m('td', block.pid),
                        m('td', block.start()),
                        m('td', block.end()),
                        m('td', block.length),
                        m('td', [
                            m('button', {
                                class: 'pure-button',
                                style: {
                                    display: isNaN(block.pid) || block.pid === 0 ? 'none' : 'inherit'
                                },
                                onclick: () => mmdp.vm.rm_task(block.pid)
                            }, 'Remove')
                        ])
                    ]);
                })
            ])
        ])
    ]);
};

mmdp.controller = function() {
    mmdp.vm.init();
    mmdp.fill_data();
};

mmdp.fill_data = function() {
    mmdp.vm.process_list.push(mmdp.create_task_block(0, new mmdp.Task(0, 5)));
    mmdp.vm.process_list.push(mmdp.create_task_block(5, new mmdp.Task(1, 5)));
    mmdp.vm.process_list.push(mmdp.create_task_block(26, new mmdp.Task(2, 6)));
    mmdp.vm.process_list.push(mmdp.create_task_block(10, new mmdp.Task(3, 4)));
    mmdp.vm.task_count = 3;
    mmdp.vm.empty_list.push(new mmdp.Block(14, 12));
    mmdp.vm.empty_list.push(new mmdp.Block(32, 96));
};

m.mount(document.body, mmdp);
