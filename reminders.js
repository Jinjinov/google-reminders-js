function formatDate(date) {
    var day = date.getDate();
    day = day < 10 ? ' ' + day : day;
    var month = date.getMonth() + 1;
    month = month < 10 ? '0' + month : month;
    var hours = date.getHours();
    hours = hours < 10 ? ' ' + hours : hours;
    var minutes = date.getMinutes();
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return day + "." + month + "." + date.getFullYear() + " " + hours + ':' + minutes;
}

class Reminder {
    constructor(id,title,dt,creation_timestamp_msec = null,done = false) {
        if (id == null) {
            throw 'Reminder id must not be None';
        }
        this.id = id;
        this.title = title;
        this.dt = dt;
        this.creation_timestamp_msec = creation_timestamp_msec;
        this.done = done;
    }
    toString() {
        if(this.done) {
            return `${formatDate(this.dt)} ${this.title} [Done]`;
        }
        else {
            return `${formatDate(this.dt)} ${this.title}`;
        }
    }
}

// https://developers.google.com/identity/protocols/OAuth2UserAgent

function create_reminder_request_body(reminder) {
    var body = {
        '2': {
            '1': 7
        },
        '3': {
            '2': reminder.id
        },
        '4': {
            '1': {
                '2': reminder.id
            },
            '3': reminder.title,
            '5': {
                '1': reminder.dt.year,
                '2': reminder.dt.month,
                '3': reminder.dt.day,
                '4': {
                    '1': reminder.dt.hour,
                    '2': reminder.dt.minute,
                    '3': reminder.dt.second,
                }
            },
            '8': 0
        }
    };

    return JSON.stringify(body);
}

function get_reminder_request_body(reminder_id) {
    var body = {'2': [{'2': reminder_id}]};

    return JSON.stringify(body);
}

function delete_reminder_request_body(reminder_id) {
    var body = {'2': [{'2': reminder_id}]};

    return JSON.stringify(body);
}

function list_reminder_request_body(num_reminders, max_timestamp_msec = 0) {
    /*
    The body corresponds to a request that retrieves a maximum of num_reminders reminders, 
    whose creation timestamp is less than max_timestamp_msec.
    max_timestamp_msec is a unix timestamp in milliseconds. 
    if its value is 0, treat it as current time.
    */
    var body = {
        '5': 1,  // boolean field: 0 or 1. 0 doesn't work ¯\_(ツ)_/¯
        '6': num_reminders,  // number of reminders to retrieve
    };
    
    if (max_timestamp_msec) {
        max_timestamp_msec += Number(15 * 3600 * 1000);
        body['16'] = max_timestamp_msec;
        /*
        Empirically, when requesting with a certain timestamp, reminders with the given timestamp 
        or even a bit smaller timestamp are not returned. 
        Therefore we increase the timestamp by 15 hours, which seems to solve this...  ~~voodoo~~
        (I wish Google had a normal API for reminders)
        */
    }

    return JSON.stringify(body);
}

function build_reminder(reminder_dict) {
    var r = reminder_dict;

    try {
        var id = r['1']['2'];
        var title = r['3'];

        var year = r['5']['1'];
        var month = r['5']['2'];
        var day = r['5']['3'];

        var date_time = new Date(year, month-1, day);

        if('4' in r['5']) {
            var hour = r['5']['4']['1'];
            var minute = r['5']['4']['2'];
            var second = r['5']['4']['3'];

            date_time.setHours(hour, minute, second);
        }

        var creation_timestamp_msec = Number(r['18']);
        var done = '8' in r && r['8'] == 1;
        
        return new Reminder(
            id,
            title,
            date_time,
            creation_timestamp_msec,
            done
        );
    }
    catch (KeyError) {
        console.log('build_reminder failed: unrecognized reminder dictionary format');
        return null;
    }
}
    
function create_reminder(reminder, access_token, callback) {
    /*
    send a 'create reminder' request.
    returns True upon a successful creation of a reminder
    */

    var xhr = new XMLHttpRequest();

    xhr.open('POST', 'https://reminders-pa.clients6.google.com/v1internalOP/reminders/create' + '?' + 'access_token=' + access_token);
    xhr.setRequestHeader('Content-type', 'application/json+protobuf');
        
    xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
            callback(true);
        }
        else if (xhr.readyState === 4 && xhr.status === 401) {
            callback(false);
        }
    }

    xhr.send(create_reminder_request_body(reminder));
}

function get_reminder(reminder_id, access_token, callback) {
    /*
    retrieve information about the reminder with the given id. 
    None if an error occurred
    */

    var xhr = new XMLHttpRequest();

    xhr.open('POST', 'https://reminders-pa.clients6.google.com/v1internalOP/reminders/get' + '?' + 'access_token=' + access_token);
    xhr.setRequestHeader('Content-type', 'application/json+protobuf');

    xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var content_dict = JSON.parse(xhr.response);

            if (content_dict == {}) {
                console.log(`Couldn't find reminder with id=${reminder_id}`);
            }
            else {
                var reminder_dict = content_dict['1'][0];
                callback(build_reminder(reminder_dict));
            }
        }
        else if (xhr.readyState === 4 && xhr.status === 401) {
            callback(null);
        }
    }

    xhr.send(get_reminder_request_body(reminder_id));
}

function delete_reminder(reminder_id, access_token, callback) {
    /*
    delete the reminder with the given id.
    Returns True upon a successful deletion
    */

    var xhr = new XMLHttpRequest();

    xhr.open('POST', 'https://reminders-pa.clients6.google.com/v1internalOP/reminders/delete' + '?' + 'access_token=' + access_token);
    xhr.setRequestHeader('Content-type', 'application/json+protobuf');

    xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
            callback(true);
        }
        else if (xhr.readyState === 4 && xhr.status === 401) {
            callback(false);
        }
    }

    xhr.send(delete_reminder_request_body(reminder_id));
}

function list_reminders(num_reminders, access_token, callback) {
    /*
    returns a list of the last num_reminders created reminders, or
    None if an error occurred
    */

    var xhr = new XMLHttpRequest();

    xhr.open('POST', 'https://reminders-pa.clients6.google.com/v1internalOP/reminders/list' + '?' + 'access_token=' + access_token);
    xhr.setRequestHeader('Content-type', 'application/json+protobuf');
    
    xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var content_dict = JSON.parse(xhr.response);

            if (!('1' in content_dict)) {
                console.log('No reminders found');
            }
            else {
                var reminders_dict_list = content_dict['1'];
                var reminders = [];

                for(var reminder_dict of reminders_dict_list) {
                    reminders.push(build_reminder(reminder_dict));
                }

                callback(reminders);
            }
        }
        else if (xhr.readyState === 4 && xhr.status === 401) {
            callback(null);
        }
    }

    xhr.send(list_reminder_request_body(num_reminders));
}
