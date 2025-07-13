mongo
use refresh-desk
db.ticketdisplayidmaps.find().forEach(doc => {
  if (typeof doc.ticket_id !== 'object') {
    db.ticketdisplayidmaps.updateOne(
      { _id: doc._id },
      { $set: { ticket_id: new ObjectId(doc.ticket_id.toString()) } }
    );
  }
});